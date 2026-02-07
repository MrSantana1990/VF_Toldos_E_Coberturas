import { createExpressMiddleware } from "@trpc/server/adapters/express";
import type { Express } from "express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerOAuthRoutes } from "./oauth";

export type ApiRoutesOptions = {
  basePath?: string;
};

function normalizeBasePath(basePath: string | undefined): string {
  if (!basePath) return "/api";
  const trimmed = basePath.trim();
  if (!trimmed) return "";
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

export function registerApiRoutes(app: Express, opts: ApiRoutesOptions = {}) {
  const basePath = normalizeBasePath(opts.basePath);

  registerOAuthRoutes(app, { basePath });

  const trpcPath = `${basePath}/trpc` || "/trpc";
  app.use(
    trpcPath,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
}

