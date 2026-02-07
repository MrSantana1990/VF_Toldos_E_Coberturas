# VF Toldos & Coberturas — Sistema

Aplicação full-stack (Vite + React no front, Express + tRPC no backend) com persistência via Drizzle/MySQL.

## Requisitos

- Node.js
- pnpm (recomendado)

## Rodar local

1) Instalar dependências:

`pnpm install`

2) Criar `.env` na raiz (use `.env.example` como base).

3) Rodar em desenvolvimento (Vite via middleware no Express):

`pnpm dev`

Abra `http://localhost:3000`.

## Build/produção local

`pnpm build`

`pnpm start`

## Deploy no Netlify (GitHub → Netlify)

Este repo já inclui `netlify.toml`:

- `build.command`: `pnpm build`
- `build.publish`: `dist/public`
- Rewrites:
  - `/api/*` → `/.netlify/functions/api/:splat` (tRPC + OAuth callback)
  - `/*` → `/index.html` (SPA)

No Netlify, configure as variáveis de ambiente necessárias (ver `.env.example`).

## Google Drive (orçamentos + imagens)

Para armazenar **orçamentos** e carregar **imagens do portfólio** pelo Google Drive:

- Crie uma **Service Account** no Google Cloud, habilite a **Google Drive API** e gere uma chave.
- No Google Drive, compartilhe a pasta com o **e-mail** da Service Account (permissão de **Editor**).
- Configure no ambiente:
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (no Netlify, use `\\n` no lugar de quebras de linha)
  - `GOOGLE_DRIVE_QUOTES_FOLDER_ID` (pasta para JSONs de orçamentos)
  - `GOOGLE_DRIVE_IMAGES_FOLDER_ID` (pasta de imagens)

Padrão de nome recomendado para imagens:

- `001 - toldo-retratil.jpg`
- `002 - cobertura-policarbonato.png`
- `img_1.jpg`, `img_2.png`, `img-003.webp`

O sistema ordena pelo número inicial (quando existir) e usa o resto do nome como título.

## Logo

Por padrão o site usa `client/public/logo.png`. Opcionalmente você pode configurar `VITE_LOGO_URL` no `.env` para usar uma URL externa (ex.: Drive/CDN).
