import { google } from "googleapis";
import { ENV } from "./_core/env";
import { createPrivateKey } from "node:crypto";

type DriveClient = ReturnType<typeof google.drive>;

let _drive: DriveClient | null = null;
const _publicFolderCheckCache = new Map<
  string,
  { checkedAtMs: number; result: PublicFolderAccessResult }
>();
const _publicFolderListCache = new Map<
  string,
  { checkedAtMs: number; items: DriveImageItem[]; status: { ok: boolean; status: number; error?: string } }
>();

function normalizePrivateKey(key: string): string {
  // Netlify env vars often store newlines as literal "\n".
  // Also be resilient to extra surrounding quotes from copy/paste.
  let value = key.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  // Some users paste the entire Service Account JSON into the env var by mistake.
  // If it looks like JSON, try to extract `private_key` from it.
  if (value.trim().startsWith("{") && value.includes(`"private_key"`)) {
    try {
      const parsed = JSON.parse(value) as { private_key?: unknown };
      if (typeof parsed.private_key === "string" && parsed.private_key.trim()) {
        value = parsed.private_key.trim();
      }
    } catch {
      // Ignore and keep original value; we'll validate later.
    }
  }

  // Normalize any CRLF coming from copy/paste.
  value = value.replace(/\r\n/g, "\n");

  // Handle common cases:
  // - "\n" (single-escaped)  -> newline
  // - "\\n" (double-escaped) -> newline (avoid leaving stray "\" that corrupts PEM)
  value = value.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n");

  // If a stray "\" ended up right before a real newline, remove it.
  value = value.replace(/\\\n/g, "\n");

  // Basic PEM validation before handing it to crypto/OpenSSL.
  if (!value.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error(
      "Chave privada inválida: a env `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` precisa conter um PEM que começa com '-----BEGIN PRIVATE KEY-----'. (Dica: cole apenas o campo `private_key` do JSON da Service Account ou use `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`.)"
    );
  }
  if (!value.includes("-----END PRIVATE KEY-----")) {
    throw new Error(
      "Chave privada inválida: a env `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` precisa conter o final '-----END PRIVATE KEY-----'."
    );
  }

  try {
    createPrivateKey(value);
  } catch (error) {
    const asAny = error as any;
    const code = asAny?.code ? ` (${asAny.code})` : "";
    const msg = asAny?.message ? String(asAny.message) : String(error);
    throw new Error(
      [
        `Chave privada inválida${code}: o Node/OpenSSL não conseguiu decodificar o PEM.`,
        `Detalhe: ${msg}`,
        "Dica: no Netlify, a forma mais estável é usar `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` (conteúdo do JSON em base64).",
      ].join("\n")
    );
  }

  return value;
}

function isNonEmpty(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

type ServiceAccountJson = {
  client_email?: unknown;
  private_key?: unknown;
};

type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

function decodeBase64(input: string): string {
  return Buffer.from(input, "base64").toString("utf8");
}

function tryParseServiceAccountJson(
  jsonText: string
): { email?: string; privateKey?: string } | null {
  try {
    const parsed = JSON.parse(jsonText) as ServiceAccountJson;
    const email =
      typeof parsed.client_email === "string"
        ? parsed.client_email.trim()
        : undefined;
    const privateKey =
      typeof parsed.private_key === "string" ? parsed.private_key.trim() : undefined;
    return { email, privateKey };
  } catch {
    return null;
  }
}

function resolveServiceAccount(): { email: string; privateKey: string } | null {
  // Prefer JSON in base64 (avoids newline/escape issues on providers like Netlify)
  if (isNonEmpty(ENV.googleServiceAccountJsonBase64)) {
    const decoded = decodeBase64(ENV.googleServiceAccountJsonBase64);
    const parsed = tryParseServiceAccountJson(decoded);
    if (parsed?.email && parsed?.privateKey) {
      return { email: parsed.email, privateKey: parsed.privateKey };
    }
  }

  if (isNonEmpty(ENV.googleServiceAccountJson)) {
    const parsed = tryParseServiceAccountJson(ENV.googleServiceAccountJson);
    if (parsed?.email && parsed?.privateKey) {
      return { email: parsed.email, privateKey: parsed.privateKey };
    }
  }

  const email = ENV.googleServiceAccountEmail;
  let privateKey = ENV.googleServiceAccountPrivateKey;

  if (isNonEmpty(ENV.googleServiceAccountPrivateKeyBase64)) {
    privateKey = decodeBase64(ENV.googleServiceAccountPrivateKeyBase64);
  }

  if (isNonEmpty(email) && isNonEmpty(privateKey)) {
    return { email, privateKey };
  }

  return null;
}

export function isDriveConfigured() {
  const sa = resolveServiceAccount();
  if (sa?.email && sa?.privateKey) return true;

  const oauth = resolveGoogleOAuth();
  return Boolean(oauth?.clientId && oauth?.clientSecret && oauth?.refreshToken);
}

function resolveGoogleOAuth(): GoogleOAuthConfig | null {
  const clientId = ENV.googleOAuthClientId?.trim();
  const clientSecret = ENV.googleOAuthClientSecret?.trim();
  const refreshToken = ENV.googleOAuthRefreshToken?.trim();

  if (!clientId || !clientSecret || !refreshToken) return null;

  return { clientId, clientSecret, refreshToken };
}

export type PublicFolderAccessResult = {
  ok: boolean;
  status: number;
  checkedAt: string;
};

export async function checkPublicFolderAccess(
  folderId: string,
  cacheTtlMs = 60_000
): Promise<PublicFolderAccessResult> {
  const cached = _publicFolderCheckCache.get(folderId);
  const now = Date.now();
  if (cached && now - cached.checkedAtMs < cacheTtlMs) {
    return cached.result;
  }

  try {
    const response = await fetch(
      `https://drive.google.com/drive/folders/${folderId}`,
      { redirect: "follow" }
    );
    const result: PublicFolderAccessResult = {
      ok: response.ok,
      status: response.status,
      checkedAt: new Date().toISOString(),
    };
    _publicFolderCheckCache.set(folderId, { checkedAtMs: now, result });
    return result;
  } catch {
    const result: PublicFolderAccessResult = {
      ok: false,
      status: 0,
      checkedAt: new Date().toISOString(),
    };
    _publicFolderCheckCache.set(folderId, { checkedAtMs: now, result });
    return result;
  }
}

function getDrive(): DriveClient {
  if (_drive) return _drive;

  const oauth = resolveGoogleOAuth();
  if (oauth) {
    const auth = new google.auth.OAuth2(oauth.clientId, oauth.clientSecret);
    auth.setCredentials({ refresh_token: oauth.refreshToken });
    _drive = google.drive({ version: "v3", auth });
    return _drive;
  }

  const resolved = resolveServiceAccount();
  if (!resolved) {
    throw new Error(
      "Google Drive não configurado: defina as credenciais da Service Account (recomendado: GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) ou configure Google OAuth (GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN)."
    );
  }

  const auth = new google.auth.JWT({
    email: resolved.email,
    key: normalizePrivateKey(resolved.privateKey),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  _drive = google.drive({ version: "v3", auth });
  return _drive;
}

export type DriveQuote = {
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

function requireFolderId(folderId: string, envName: string) {
  if (!isNonEmpty(folderId)) {
    throw new Error(
      `Google Drive não configurado: defina ${envName} com o ID da pasta.`
    );
  }
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
}

export async function saveQuoteToDrive(quote: DriveQuote) {
  requireFolderId(ENV.googleDriveQuotesFolderId, "GOOGLE_DRIVE_QUOTES_FOLDER_ID");

  const drive = getDrive();
  const safeName = slugify(quote.clientName || "cliente");
  const fileName = `orcamento-${quote.id}-${safeName}.json`;

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [ENV.googleDriveQuotesFolderId],
      mimeType: "application/json",
    },
    media: {
      mimeType: "application/json",
      body: JSON.stringify({ version: 1, ...quote }, null, 2),
    },
    fields: "id,name",
  });

  return response.data;
}

export async function listQuotesFromDrive(limit = 100): Promise<DriveQuote[]> {
  requireFolderId(ENV.googleDriveQuotesFolderId, "GOOGLE_DRIVE_QUOTES_FOLDER_ID");

  const drive = getDrive();
  const list = await drive.files.list({
    q: `'${ENV.googleDriveQuotesFolderId}' in parents and trashed = false and mimeType = 'application/json'`,
    fields: "files(id,name,createdTime,modifiedTime)",
    orderBy: "createdTime desc",
    pageSize: Math.min(Math.max(limit, 1), 200),
  });

  const files = list.data.files ?? [];

  const results: DriveQuote[] = [];
  for (const file of files) {
    if (!file.id) continue;
    try {
      const content = await drive.files.get(
        { fileId: file.id, alt: "media" },
        { responseType: "json" }
      );
      const payload = content.data as any;
      if (!payload) continue;

      if (payload.version === 1) {
        const { version: _version, ...quote } = payload;
        results.push(quote as DriveQuote);
      } else {
        results.push(payload as DriveQuote);
      }
    } catch (error) {
      console.warn("[Drive] Falha ao ler arquivo de orçamento:", file.name, error);
    }
  }

  return results;
}

export type DriveImageItem = {
  id: string;
  name: string;
  title: string;
  order: number;
  url: string;
};

export function buildImageUrl(fileId: string, width = 1600) {
  // This URL form is generally reliable for embedding in <img>.
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`;
}

function parseImageOrder(fileName: string): number {
  const match = fileName.match(/^(\d{1,6})[\s._-]/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return parseInt(match[1]!, 10);
}

function parseImageTitle(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "");
  const withoutOrder = base.replace(/^(\d{1,6})[\s._-]+/, "");
  const cleaned = withoutOrder.replace(/[_-]+/g, " ").trim();
  return cleaned || base;
}

function parseImageOrderV2(fileName: string): number {
  // Preferred: leading number e.g. "001 - foo.jpg"
  const leading = fileName.match(/^(\d{1,6})[\s._-]/);
  if (leading) return parseInt(leading[1]!, 10);

  // Also accept patterns like "img_1.jpg", "img-002.png", "imagem 12.webp"
  const img = fileName.match(/(?:^|[^\w])(img|imagem)[\s._-]*0*(\d{1,6})(?:[\s._-]|$)/i);
  if (img) return parseInt(img[2]!, 10);

  return Number.MAX_SAFE_INTEGER;
}

function parseImageTitleV2(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "");

  // Remove leading order "001 - "
  const noLeadingOrder = base.replace(/^(\d{1,6})[\s._-]+/, "");

  // Remove "img_1", "img-001", "imagem 12" prefix when the filename is just that
  const noImgPrefix = noLeadingOrder.replace(/^(img|imagem)[\s._-]*0*\d{1,6}[\s._-]*/i, "");

  const cleaned = noImgPrefix.replace(/[_-]+/g, " ").trim();

  if (cleaned) return cleaned;

  // If it was only "img_1", make a nice title.
  const imgOnly = base.match(/^(img|imagem)[\s._-]*0*(\d{1,6})$/i);
  if (imgOnly) return `Imagem ${parseInt(imgOnly[2]!, 10)}`;

  return noLeadingOrder.replace(/[_-]+/g, " ").trim() || base;
}

export async function listImagesFromDrive(limit = 200): Promise<DriveImageItem[]> {
  requireFolderId(ENV.googleDriveImagesFolderId, "GOOGLE_DRIVE_IMAGES_FOLDER_ID");

  const drive = getDrive();
  const list = await drive.files.list({
    q: `'${ENV.googleDriveImagesFolderId}' in parents and trashed = false and mimeType contains 'image/'`,
    fields: "files(id,name,mimeType,createdTime)",
    pageSize: Math.min(Math.max(limit, 1), 500),
  });

  const files = list.data.files ?? [];
  const items: DriveImageItem[] = [];
  for (const file of files) {
    if (!file.id || !file.name) continue;
    items.push({
      id: file.id,
      name: file.name,
      title: parseImageTitleV2(file.name),
      order: parseImageOrderV2(file.name),
      url: buildImageUrl(file.id),
    });
  }

  items.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return items;
}

function decodeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value;
  }
}

function decodeHexEscapes(value: string): string {
  return value.replace(/\\x([0-9a-fA-F]{2})/g, (_m, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

function normalizeDriveHtml(value: string): string {
  // Drive embeds data using a mix of HTML entities and hex escapes inside JS strings.
  // We decode the most common ones so simple regex extraction can work.
  const withEntities = value.replace(/&quot;/g, '"');
  return decodeHexEscapes(withEntities);
}

function isImageFileName(name: string) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(name);
}

/**
 * Fallback sem credenciais:
 * - tenta extrair ids/nomes do HTML público da pasta do Drive (muito sujeito a mudanças do Google).
 * - funciona somente se a pasta estiver realmente acessível anonimamente (teste em aba anônima).
 */
export async function listImagesFromPublicDriveFolder(
  folderId: string,
  limit = 200,
  cacheTtlMs = 60_000
): Promise<{ items: DriveImageItem[]; status: { ok: boolean; status: number; error?: string } }> {
  const cached = _publicFolderListCache.get(folderId);
  const now = Date.now();
  if (cached && now - cached.checkedAtMs < cacheTtlMs) {
    return { items: cached.items, status: cached.status };
  }

  try {
    const response = await fetch(
      `https://drive.google.com/drive/folders/${folderId}`,
      {
        redirect: "follow",
        headers: {
          // Some endpoints behave differently without a browser UA
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          accept: "text/html,application/xhtml+xml",
        },
      }
    );

    const status = response.status;
    const ok = response.ok;
    const html = ok ? await response.text() : "";
    const normalizedHtml = ok ? normalizeDriveHtml(html) : "";

    if (!ok) {
      const result = { items: [] as DriveImageItem[], status: { ok, status } };
      _publicFolderListCache.set(folderId, { checkedAtMs: now, items: result.items, status: result.status });
      return result;
    }

    const found = new Map<string, string>();

    const escapedFolderId = folderId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Pattern 0: ["<fileId>",["<folderId>"],"<name>","image/<type>",...]
    const inFolder = new RegExp(
      `\\[\\"([a-zA-Z0-9_-]{20,})\\",\\s*\\[\\s*\\"${escapedFolderId}\\"\\s*\\],\\s*\\"([^\\"]+\\.(?:png|jpe?g|webp|gif|avif))\\",\\s*\\"image\\\\/`,
      "gi"
    );
    let m: RegExpExecArray | null = null;
    while ((m = inFolder.exec(normalizedHtml)) !== null) {
      const id = m[1]!;
      const name = decodeJsonString(m[2]!);
      if (isImageFileName(name)) found.set(id, name);
    }

    // Pattern 1: ["<id>","<name>", ...]
    const arrayPair =
      /\[\s*"([a-zA-Z0-9_-]{20,})"\s*,\s*"([^"]+\.(?:png|jpe?g|webp|gif|avif))"/gi;
    while ((m = arrayPair.exec(normalizedHtml)) !== null) {
      const id = m[1]!;
      const name = decodeJsonString(m[2]!);
      if (isImageFileName(name)) found.set(id, name);
    }

    // Pattern 2: "id":"<id>" ... "name":"<name>"
    const objectPair =
      /"id"\s*:\s*"([a-zA-Z0-9_-]{20,})"[^}]*?"name"\s*:\s*"([^"]+\.(?:png|jpe?g|webp|gif|avif))"/gi;
    while ((m = objectPair.exec(normalizedHtml)) !== null) {
      const id = m[1]!;
      const name = decodeJsonString(m[2]!);
      if (isImageFileName(name)) found.set(id, name);
    }

    const items: DriveImageItem[] = Array.from(found.entries()).map(
      ([id, name]) => ({
        id,
        name,
        title: parseImageTitleV2(name),
        order: parseImageOrderV2(name),
        url: buildImageUrl(id),
      })
    );

    items.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    const limited = items.slice(0, Math.min(Math.max(limit, 1), 500));

    const result = { items: limited, status: { ok: true, status } };
    _publicFolderListCache.set(folderId, { checkedAtMs: now, items: result.items, status: result.status });
    return result;
  } catch (error) {
    const result = {
      items: [] as DriveImageItem[],
      status: { ok: false, status: 0, error: String(error) },
    };
    _publicFolderListCache.set(folderId, { checkedAtMs: now, items: result.items, status: result.status });
    return result;
  }
}
