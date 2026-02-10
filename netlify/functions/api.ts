import express from "express";
import serverless from "serverless-http";
import { registerApiRoutes } from "../../server/_core/api";

const app = express();
app.set("trust proxy", true);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// The Netlify rewrite maps `/api/*` -> `/.netlify/functions/api/:splat`,
// so inside the function we register routes without the `/api` prefix.
registerApiRoutes(app, { basePath: "" });

export const handler = serverless(app, {
  basePath: "/.netlify/functions/api",
});
