export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  adminUsername: process.env.ADMIN_USERNAME ?? "admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin2026",
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "",
  googleServiceAccountPrivateKey:
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "",
  googleServiceAccountPrivateKeyBase64:
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64 ?? "",
  googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? "",
  googleServiceAccountJsonBase64:
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ?? "",
  googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
  googleOAuthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
  googleOAuthRefreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN ?? "",
  googleDriveQuotesFolderId: process.env.GOOGLE_DRIVE_QUOTES_FOLDER_ID ?? "",
  // Pasta pública do Drive (imagens + logo) usada pelo site.
  // Se quiser trocar, defina `GOOGLE_DRIVE_IMAGES_FOLDER_ID` no ambiente (Netlify) ou `.env` local.
  googleDriveImagesFolderId:
    process.env.GOOGLE_DRIVE_IMAGES_FOLDER_ID ||
    "1eb1HNBEMNyWPrTBrtgSUsw3HXA36VnOR",
};
