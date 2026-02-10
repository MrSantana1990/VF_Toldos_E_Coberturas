import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ADMIN_COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";
import { ENV } from "./env";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getJwtSecret() {
  const secret = ENV.cookieSecret;
  return new TextEncoder().encode(secret);
}

async function tryAuthenticateAdmin(
  req: CreateExpressContextOptions["req"]
): Promise<User | null> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const parsed = parseCookieHeader(cookieHeader);
  const token = parsed[ADMIN_COOKIE_NAME];
  if (!isNonEmptyString(token)) return null;

  if (!isNonEmptyString(ENV.cookieSecret)) return null;

  try {
    const secretKey = getJwtSecret();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    const typ = payload["typ"];
    const role = payload["role"];
    const name = payload["name"];
    const openId = payload["openId"];

    if (typ !== "admin") return null;
    if (role !== "admin") return null;
    if (!isNonEmptyString(name) || !isNonEmptyString(openId)) return null;

    const now = new Date();
    return {
      id: 0,
      openId,
      name,
      email: null,
      loginMethod: "local",
      role: "admin",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  if (!user) {
    // Fallback: login local do painel administrativo.
    user = await tryAuthenticateAdmin(opts.req);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
