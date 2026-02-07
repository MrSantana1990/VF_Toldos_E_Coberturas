import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import * as db from "./db";
import {
  checkPublicFolderAccess,
  buildImageUrl,
  isDriveConfigured,
  listImagesFromPublicDriveFolder,
  listImagesFromDrive,
  listQuotesFromDrive,
  saveQuoteToDrive,
  type DriveQuote,
} from "./drive";
import { z } from "zod";

type QuoteDto = {
  id: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  toldoType: "fixo" | "retratil" | "cortina" | "policarbonato";
  material: string | null;
  width: string;
  projection: string;
  areaM2: string | null;
  notes: string | null;
  status: "pending" | "completed" | "rejected";
  createdAt: string;
  updatedAt: string;
};

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  return new Date().toISOString();
}

function toQuoteDto(input: any): QuoteDto {
  return {
    id: Number(input.id),
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    clientPhone: input.clientPhone,
    toldoType: input.toldoType,
    material: input.material ?? null,
    width: String(input.width),
    projection: String(input.projection),
    areaM2:
      input.areaM2 === undefined
        ? null
        : input.areaM2 === null
          ? null
          : String(input.areaM2),
    notes: input.notes ?? null,
    status: input.status ?? "pending",
    createdAt: toIso(input.createdAt),
    updatedAt: toIso(input.updatedAt),
  };
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  quotes: router({
    create: publicProcedure
      .input(z.object({
        clientName: z.string().min(1),
        clientEmail: z.string().email(),
        clientPhone: z.string().min(1),
        toldoType: z.enum(["fixo", "retratil", "cortina", "policarbonato"]),
        material: z.string().nullable(),
        width: z.number().positive(),
        projection: z.number().positive(),
        areaM2: z.number().positive(),
        notes: z.string().nullable(),
      }))
      .mutation(async ({ input }) => {
        const nowIso = new Date().toISOString();
        const dbConn = await db.getDb();

        if (dbConn) {
          await db.createQuote({
            clientName: input.clientName,
            clientEmail: input.clientEmail,
            clientPhone: input.clientPhone,
            toldoType: input.toldoType,
            material: input.material,
            width: input.width.toString(),
            projection: input.projection.toString(),
            areaM2: input.areaM2.toString(),
            notes: input.notes,
            status: "pending",
          });
        } else if (isDriveConfigured()) {
          const quote: DriveQuote = {
            id: Date.now(),
            clientName: input.clientName,
            clientEmail: input.clientEmail,
            clientPhone: input.clientPhone,
            toldoType: input.toldoType,
            material: input.material,
            width: input.width.toString(),
            projection: input.projection.toString(),
            areaM2: input.areaM2.toString(),
            notes: input.notes,
            status: "pending",
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          try {
            await saveQuoteToDrive(quote);
          } catch (error) {
            console.error("[Drive] Falha ao salvar orçamento:", error);
            throw new Error(
              "Falha ao salvar orçamento no Google Drive. Verifique as variáveis de ambiente e o compartilhamento da pasta."
            );
          }
        } else {
          throw new Error(
            "Sem banco (DATABASE_URL) e sem Google Drive configurado. Configure o banco ou as variáveis do Drive."
          );
        }
        await notifyOwner({
          title: "Novo Orçamento Recebido",
          content: `${input.clientName} solicitou um orçamento de toldo ${input.toldoType} com medidas ${input.width}m x ${input.projection}m (${input.areaM2}m²).\n\nContato: ${input.clientEmail} / ${input.clientPhone}`,
        });
        return { success: true };
      }),
    list: protectedProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (dbConn) {
        const rows = await db.getQuotes();
        return rows.map(toQuoteDto);
      }

      if (!isDriveConfigured()) return [];
      try {
        const rows = await listQuotesFromDrive(100);
        return rows.map(toQuoteDto);
      } catch (error) {
        console.warn("[Drive] Orçamentos indisponíveis:", error);
        return [];
      }
    }),
    stats: protectedProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (dbConn) {
        return db.getQuotesStats();
      }

      if (!isDriveConfigured()) return { total: 0, pending: 0, completed: 0 };
      try {
        const rows = await listQuotesFromDrive(200);
        const total = rows.length;
        const pending = rows.filter(q => q.status === "pending").length;
        const completed = rows.filter(q => q.status === "completed").length;
        return { total, pending, completed };
      } catch (error) {
        console.warn("[Drive] Estatísticas indisponíveis:", error);
        return { total: 0, pending: 0, completed: 0 };
      }
    }),
  }),

  gallery: router({
    list: publicProcedure.query(async () => {
      const folderId = ENV.googleDriveImagesFolderId;
      if (!folderId) return [];

      // Prefer API (Service Account). If not configured, try public scraping fallback.
      if (isDriveConfigured()) {
        try {
          const items = await listImagesFromDrive(200);
          return items.map(item => ({
            id: item.id,
            name: item.name,
            title: item.title,
            url: item.url,
          }));
        } catch (error) {
          console.warn("[Drive] Galeria via API falhou, tentando modo público:", error);
        }
      }

      const publicResult = await listImagesFromPublicDriveFolder(folderId, 200);
      if (!publicResult.status.ok) {
        console.warn("[Drive] Galeria pública indisponível:", publicResult.status);
        return [];
      }

      return publicResult.items.map(item => ({
        id: item.id,
        name: item.name,
        title: item.title,
        url: item.url,
      }));
    }),
    logo: publicProcedure.query(async () => {
      const folderId = ENV.googleDriveImagesFolderId;
      if (!folderId) return null;

      const isLogoName = (name: string) => {
        const normalized = name.trim().toLowerCase();
        return normalized === "logo.png" || normalized === "logo.jpg" || normalized === "logo.jpeg" || normalized === "logo.webp";
      };

      const pickLogo = (items: { id: string; name: string }[]) => {
        const logo = items.find(i => isLogoName(i.name));
        return logo ? { id: logo.id, name: logo.name, url: buildImageUrl(logo.id, 500) } : null;
      };

      if (isDriveConfigured()) {
        try {
          const items = await listImagesFromDrive(400);
          const found = pickLogo(items);
          if (found) return found;
        } catch (error) {
          console.warn("[Drive] Logo via API falhou, tentando modo público:", error);
        }
      }

      const publicResult = await listImagesFromPublicDriveFolder(folderId, 400);
      if (!publicResult.status.ok) return null;
      return pickLogo(publicResult.items);
    }),
    status: publicProcedure.query(async () => {
      const folderId = ENV.googleDriveImagesFolderId;
      const configured = isDriveConfigured();
      const folderIdSet = Boolean(folderId);
      const publicAccess = folderIdSet
        ? await checkPublicFolderAccess(folderId)
        : null;

      const publicList = folderIdSet
        ? await listImagesFromPublicDriveFolder(folderId, 5)
        : null;

      let serviceAccountAccess: { ok: boolean; error?: string } | null = null;
      if (configured && folderIdSet) {
        try {
          await listImagesFromDrive(1);
          serviceAccountAccess = { ok: true };
        } catch (error) {
          serviceAccountAccess = { ok: false, error: String(error) };
        }
      }

      return {
        configured,
        folderIdSet,
        folderId: folderIdSet ? folderId : null,
        publicAccess,
        publicList: publicList
          ? { ...publicList.status, count: publicList.items.length }
          : null,
        serviceAccountAccess,
      };
    }),
  }),
  appointments: router({
    list: protectedProcedure.query(async () => {
      return db.getAppointments();
    }),
  }),
  transactions: router({
    list: protectedProcedure.query(async () => {
      return db.getTransactions();
    }),
  }),
});

export type AppRouter = typeof appRouter;
