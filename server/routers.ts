import { ADMIN_COOKIE_NAME, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  publicProcedure,
  protectedProcedure,
  router,
} from "./_core/trpc";
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
  updateQuoteStatusInDrive,
  saveQuoteToDrive,
  listAppointmentsFromDrive,
  saveAppointmentToDrive,
  updateAppointmentStatusInDrive,
  listTransactionsFromDrive,
  saveTransactionToDrive,
  listReceiptsFromDrive,
  saveReceiptToDrive,
  getReceiptFromDriveById,
  type DriveQuote,
} from "./drive";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { SignJWT } from "jose";

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
  source?: "db" | "drive";
  driveFileId?: string | null;
  driveFileName?: string | null;
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
    source:
      input.source ?? (input.driveFileId || input.fileId ? "drive" : "db"),
    driveFileId: input.driveFileId ?? input.fileId ?? null,
    driveFileName: input.driveFileName ?? input.fileName ?? null,
  };
}

type AppointmentDto = {
  id: string | number;
  quoteId?: number | null;
  clientName: string;
  clientPhone: string;
  appointmentDate: string;
  appointmentType: "visita_tecnica" | "instalacao" | "manutencao";
  address?: string | null;
  description?: string | null;
  status: "agendado" | "concluido" | "cancelado";
  createdAt: string;
  updatedAt: string;
  source?: "db" | "drive";
  driveFileId?: string | null;
  driveFileName?: string | null;
};

function toAppointmentDto(input: any): AppointmentDto {
  return {
    id: input.id,
    quoteId: input.quoteId ?? null,
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    appointmentDate: toIso(input.appointmentDate),
    appointmentType: input.appointmentType,
    address: input.address ?? null,
    description: input.description ?? null,
    status: input.status ?? "agendado",
    createdAt: toIso(input.createdAt),
    updatedAt: toIso(input.updatedAt),
    source: input.source ?? (input.fileId ? "drive" : "db"),
    driveFileId: input.driveFileId ?? input.fileId ?? null,
    driveFileName: input.driveFileName ?? input.fileName ?? null,
  };
}

type TransactionDto = {
  id: string | number;
  type: "entrada" | "saida";
  category: string;
  description: string | null;
  amount: string;
  transactionDate: string;
  paymentMethod?: string | null;
  relatedQuoteId?: number | null;
  relatedReceiptId?: string | null;
  createdAt: string;
  updatedAt: string;
  source?: "db" | "drive";
  driveFileId?: string | null;
  driveFileName?: string | null;
};

function toTransactionDto(input: any): TransactionDto {
  return {
    id: input.id,
    type: input.type,
    category: input.category,
    description: input.description ?? null,
    amount: String(input.amount),
    transactionDate: toIso(input.transactionDate),
    paymentMethod: input.paymentMethod ?? null,
    relatedQuoteId: input.relatedQuoteId ?? null,
    relatedReceiptId: input.relatedReceiptId ?? null,
    createdAt: toIso(input.createdAt),
    updatedAt: toIso(input.updatedAt),
    source: input.source ?? (input.fileId ? "drive" : "db"),
    driveFileId: input.driveFileId ?? input.fileId ?? null,
    driveFileName: input.driveFileName ?? input.fileName ?? null,
  };
}

type ReceiptDto = {
  id: string;
  relatedQuoteId?: number | null;
  clientName: string;
  clientEmail?: string | null;
  clientPhone: string;
  serviceDescription: string;
  amount: string;
  paymentMethod?: string | null;
  notes?: string | null;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
  driveFileId?: string | null;
  driveFileName?: string | null;
};

function toReceiptDto(input: any): ReceiptDto {
  return {
    id: String(input.id),
    relatedQuoteId: input.relatedQuoteId ?? null,
    clientName: input.clientName,
    clientEmail: input.clientEmail ?? null,
    clientPhone: input.clientPhone,
    serviceDescription: input.serviceDescription,
    amount: String(input.amount),
    paymentMethod: input.paymentMethod ?? null,
    notes: input.notes ?? null,
    issuedAt: toIso(input.issuedAt),
    createdAt: toIso(input.createdAt),
    updatedAt: toIso(input.updatedAt),
    driveFileId: input.driveFileId ?? input.fileId ?? null,
    driveFileName: input.driveFileName ?? input.fileName ?? null,
  };
}

function formatDriveError(error: unknown): string {
  const asAny = error as any;
  const status =
    asAny?.code ?? asAny?.response?.status ?? asAny?.status ?? undefined;
  const statusText = asAny?.response?.statusText ?? undefined;
  const message =
    asAny?.response?.data?.error?.message ?? asAny?.message ?? String(error);

  const msg = String(message ?? "").trim();
  const msgLower = msg.toLowerCase();

  const hints: string[] = [];
  if (
    msgLower.includes("accessnotconfigured") ||
    msgLower.includes("has not been used")
  ) {
    hints.push(
      "Dica: ative a Google Drive API no Google Cloud do projeto da Service Account."
    );
  }
  if (
    msgLower.includes("invalid_grant") ||
    msgLower.includes("invalid jwt") ||
    msgLower.includes("jwt")
  ) {
    hints.push(
      "Dica: confira se `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` foi colada corretamente (sem aspas extras; com `\\n`)."
    );
  }
  if (msgLower.includes("file not found") || msgLower.includes("not found")) {
    hints.push(
      "Dica: confirme se `GOOGLE_DRIVE_QUOTES_FOLDER_ID` está correto e se a pasta foi compartilhada com o e-mail da Service Account como Editor."
    );
  }
  if (
    msgLower.includes("insufficientpermissions") ||
    msgLower.includes("permission") ||
    msgLower.includes("forbidden")
  ) {
    hints.push(
      "Dica: compartilhe a pasta de orçamentos com o e-mail da Service Account como Editor e tente novamente."
    );
  }
  if (msgLower.includes("service accounts do not have storage quota")) {
    hints.push(
      "Dica: Service Account pode falhar para upload por falta de quota. Configure Google OAuth (GOOGLE_OAUTH_CLIENT_ID/GOOGLE_OAUTH_CLIENT_SECRET/GOOGLE_OAUTH_REFRESH_TOKEN) para salvar usando sua conta Google."
    );
  }

  const statusPart =
    status !== undefined
      ? ` (status ${status}${statusText ? ` ${statusText}` : ""})`
      : "";

  return [
    `Detalhes do erro${statusPart}: ${msg}`,
    hints.length ? hints.join(" ") : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(
        z.object({
          username: z.string().min(1),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const username = input.username.trim();
        const password = input.password;

        const expectedUsername = (ENV.adminUsername ?? "admin").trim();
        const expectedPassword = ENV.adminPassword ?? "admin2026";

        const enc = new TextEncoder();
        const aUser = enc.encode(username);
        const bUser = enc.encode(expectedUsername);
        const aPass = enc.encode(password);
        const bPass = enc.encode(expectedPassword);

        const userOk =
          aUser.length === bUser.length && timingSafeEqual(aUser, bUser);
        const passOk =
          aPass.length === bPass.length && timingSafeEqual(aPass, bPass);

        if (!userOk || !passOk) {
          throw new Error("Usuário ou senha inválidos.");
        }

        if (!ENV.cookieSecret) {
          throw new Error(
            "JWT_SECRET não configurado. Defina JWT_SECRET no ambiente para habilitar o login do admin."
          );
        }

        const secretKey = enc.encode(ENV.cookieSecret);
        const expiresInMs = ONE_YEAR_MS;
        const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);

        const token = await new SignJWT({
          typ: "admin",
          role: "admin",
          openId: "admin-local",
          name: "Admin",
          username,
        })
          .setProtectedHeader({ alg: "HS256", typ: "JWT" })
          .setExpirationTime(expirationSeconds)
          .sign(secretKey);

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(ADMIN_COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: expiresInMs,
        });

        return {
          ok: true,
          user: {
            id: 0,
            openId: "admin-local",
            name: "Admin",
            email: null,
            loginMethod: "local",
            role: "admin",
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
          },
        } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(ADMIN_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  quotes: router({
    create: publicProcedure
      .input(
        z.object({
          clientName: z.string().min(1),
          clientEmail: z.string().email(),
          clientPhone: z.string().min(1),
          toldoType: z.enum(["fixo", "retratil", "cortina", "policarbonato"]),
          material: z.string().nullable(),
          width: z.number().positive(),
          projection: z.number().positive(),
          areaM2: z.number().positive(),
          notes: z.string().nullable(),
        })
      )
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
          if (!ENV.googleDriveQuotesFolderId) {
            throw new Error(
              "Google Drive configurado (Service Account), mas falta definir GOOGLE_DRIVE_QUOTES_FOLDER_ID no ambiente."
            );
          }
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
              [
                "Falha ao salvar orçamento no Google Drive. Verifique as variáveis de ambiente e o compartilhamento da pasta.",
                formatDriveError(error),
              ].join("\n")
            );
          }
        } else {
          const missingEmail = !ENV.googleServiceAccountEmail?.trim();
          const missingKey = !ENV.googleServiceAccountPrivateKey?.trim();
          const missingFolder = !ENV.googleDriveQuotesFolderId?.trim();
          throw new Error(
            [
              "Sem banco (DATABASE_URL) e sem Google Drive configurado para salvar orçamentos.",
              "Configure o banco ou defina as variáveis do Drive no ambiente (Netlify).",
              "",
              `- GOOGLE_SERVICE_ACCOUNT_EMAIL: ${missingEmail ? "FALTANDO" : "OK"}`,
              `- GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: ${missingKey ? "FALTANDO" : "OK"}`,
              `- GOOGLE_DRIVE_QUOTES_FOLDER_ID: ${missingFolder ? "FALTANDO" : "OK"}`,
            ].join("\n")
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
        return rows.map(r => toQuoteDto({ ...r, source: "db" }));
      }

      if (!isDriveConfigured()) return [];
      try {
        const rows = await listQuotesFromDrive(100);
        return rows.map(r => toQuoteDto({ ...r, source: "drive" }));
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
    updateStatus: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["pending", "completed", "rejected"]),
        })
      )
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (dbConn) {
          await db.updateQuoteStatus(input.id, input.status);
          return { success: true } as const;
        }

        if (!isDriveConfigured()) {
          throw new Error(
            "Google Drive não configurado para atualizar status."
          );
        }

        await updateQuoteStatusInDrive(input.id, input.status);
        return { success: true } as const;
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
          console.warn(
            "[Drive] Galeria via API falhou, tentando modo público:",
            error
          );
        }
      }

      const publicResult = await listImagesFromPublicDriveFolder(folderId, 200);
      if (!publicResult.status.ok) {
        console.warn(
          "[Drive] Galeria pública indisponível:",
          publicResult.status
        );
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
        return (
          normalized === "logo.png" ||
          normalized === "logo.jpg" ||
          normalized === "logo.jpeg" ||
          normalized === "logo.webp"
        );
      };

      const pickLogo = (items: { id: string; name: string }[]) => {
        const logo = items.find(i => isLogoName(i.name));
        return logo
          ? { id: logo.id, name: logo.name, url: buildImageUrl(logo.id, 500) }
          : null;
      };

      if (isDriveConfigured()) {
        try {
          const items = await listImagesFromDrive(400);
          const found = pickLogo(items);
          if (found) return found;
        } catch (error) {
          console.warn(
            "[Drive] Logo via API falhou, tentando modo público:",
            error
          );
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
    list: adminProcedure.query(async () => {
      if (ENV.databaseUrl) {
        const items = await db.getAppointments();
        return items.map(toAppointmentDto);
      }
      if (!isDriveConfigured()) {
        throw new Error(
          "Sem banco (DATABASE_URL) e sem Google Drive configurado para listar agendamentos."
        );
      }
      const items = await listAppointmentsFromDrive(200);
      return items.map(toAppointmentDto);
    }),
    create: adminProcedure
      .input(
        z.object({
          quoteId: z.number().nullable().optional(),
          clientName: z.string().min(1),
          clientPhone: z.string().min(1),
          appointmentDate: z.string().min(1),
          appointmentType: z.enum([
            "visita_tecnica",
            "instalacao",
            "manutencao",
          ]),
          address: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        if (ENV.databaseUrl) {
          await db.createAppointment({
            quoteId: input.quoteId ?? null,
            clientName: input.clientName,
            clientPhone: input.clientPhone,
            appointmentDate: new Date(input.appointmentDate),
            appointmentType: input.appointmentType,
            description: input.description ?? null,
            status: "agendado",
          });
          return { ok: true };
        }

        if (!isDriveConfigured()) {
          throw new Error(
            "Google Drive não configurado para salvar agendamentos."
          );
        }

        const created = await saveAppointmentToDrive({
          quoteId: input.quoteId ?? null,
          clientName: input.clientName,
          clientPhone: input.clientPhone,
          appointmentDate: input.appointmentDate,
          appointmentType: input.appointmentType,
          address: input.address ?? null,
          description: input.description ?? null,
          status: "agendado",
        });
        return toAppointmentDto(created);
      }),
    updateStatus: adminProcedure
      .input(
        z.object({
          id: z.union([z.string().min(1), z.number()]),
          status: z.enum(["agendado", "concluido", "cancelado"]),
        })
      )
      .mutation(async ({ input }) => {
        if (ENV.databaseUrl) {
          const id = Number(input.id);
          if (!Number.isFinite(id)) throw new Error("ID inválido.");
          await db.updateAppointmentStatus(id, input.status);
          return { ok: true };
        }

        if (!isDriveConfigured()) {
          throw new Error(
            "Google Drive não configurado para atualizar agendamentos."
          );
        }

        await updateAppointmentStatusInDrive(String(input.id), input.status);
        return { ok: true };
      }),
  }),
  receipts: router({
    list: adminProcedure.query(async () => {
      if (!isDriveConfigured()) {
        throw new Error("Google Drive não configurado para listar recibos.");
      }
      const items = await listReceiptsFromDrive(200);
      return items.map(toReceiptDto);
    }),
    create: adminProcedure
      .input(
        z.object({
          relatedQuoteId: z.number().nullable().optional(),
          clientName: z.string().min(1),
          clientEmail: z.string().email().optional(),
          clientPhone: z.string().min(1),
          serviceDescription: z.string().min(1),
          amount: z.union([z.string().min(1), z.number()]),
          paymentMethod: z.string().optional(),
          notes: z.string().optional(),
          issuedAt: z.string().optional(),
          createTransaction: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        if (!isDriveConfigured()) {
          throw new Error("Google Drive não configurado para salvar recibos.");
        }

        const receipt = await saveReceiptToDrive({
          relatedQuoteId: input.relatedQuoteId ?? null,
          clientName: input.clientName,
          clientEmail: input.clientEmail ?? null,
          clientPhone: input.clientPhone,
          serviceDescription: input.serviceDescription,
          amount: String(input.amount),
          paymentMethod: input.paymentMethod ?? null,
          notes: input.notes ?? null,
          issuedAt: input.issuedAt ?? new Date().toISOString(),
        });

        if (input.createTransaction !== false) {
          await saveTransactionToDrive({
            type: "entrada",
            category: "Recibo",
            description: `Recibo ${receipt.id} - ${receipt.clientName}`,
            amount: receipt.amount,
            transactionDate: receipt.issuedAt,
            paymentMethod: receipt.paymentMethod ?? null,
            relatedQuoteId: receipt.relatedQuoteId ?? null,
            relatedReceiptId: receipt.id,
          });
        }

        return toReceiptDto(receipt);
      }),
    publicGet: publicProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(async ({ input }) => {
        if (!isDriveConfigured()) {
          throw new Error(
            "Google Drive não configurado para consultar recibos."
          );
        }
        const found = await getReceiptFromDriveById(input.id);
        return found ? toReceiptDto(found) : null;
      }),
  }),
  transactions: router({
    list: adminProcedure.query(async () => {
      if (ENV.databaseUrl) {
        const items = await db.getTransactions();
        return items.map(toTransactionDto);
      }
      if (!isDriveConfigured()) {
        throw new Error(
          "Sem banco (DATABASE_URL) e sem Google Drive configurado para listar finanças."
        );
      }
      const items = await listTransactionsFromDrive(300);
      return items.map(toTransactionDto);
    }),
    create: adminProcedure
      .input(
        z.object({
          type: z.enum(["entrada", "saida"]),
          category: z.string().min(1),
          description: z.string().optional(),
          amount: z.union([z.string().min(1), z.number()]),
          transactionDate: z.string().optional(),
          paymentMethod: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        if (ENV.databaseUrl) {
          await db.createTransaction({
            type: input.type,
            category: input.category,
            description: input.description ?? null,
            amount: String(input.amount) as any,
            transactionDate: new Date(input.transactionDate ?? Date.now()),
            paymentMethod: input.paymentMethod ?? null,
          });
          return { ok: true };
        }

        if (!isDriveConfigured()) {
          throw new Error("Google Drive não configurado para salvar finanças.");
        }

        const created = await saveTransactionToDrive({
          type: input.type,
          category: input.category,
          description: input.description ?? null,
          amount: String(input.amount),
          transactionDate: input.transactionDate ?? new Date().toISOString(),
          paymentMethod: input.paymentMethod ?? null,
        });
        return toTransactionDto(created);
      }),
  }),
});

export type AppRouter = typeof appRouter;
