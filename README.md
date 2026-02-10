# VF Toldos & Coberturas — Sistema

Aplicação full-stack (Vite + React no front, Express + tRPC no backend) com persistência via Drizzle/MySQL.

## Requisitos

- Node.js
- pnpm (recomendado)

## Rodar local

1. Instalar dependências:

`pnpm install`

2. Criar `.env` na raiz (use `.env.example` como base).

3. Rodar em desenvolvimento (Vite via middleware no Express):

`pnpm dev`

Abra `http://localhost:3000`.

## Painel administrativo

- URL: `/admin/login`
- Usuário/senha padrão: `admin` / `admin2026` (você pode sobrescrever com `ADMIN_USERNAME` e `ADMIN_PASSWORD` no ambiente).

## WhatsApp (painel admin)

Na tela de orçamentos (`/admin/quotes`) existem botões para:

- **WhatsApp cliente**: abre a conversa com o cliente com uma mensagem pronta.
- **Cópia VS**: abre uma cópia do orçamento no WhatsApp da empresa.
- **Cópia dev**: abre uma cópia no WhatsApp do desenvolvedor (só aparece se configurar).

Variáveis do frontend (Vite):

- `VITE_WHATSAPP_COMPANY_PHONE` (ex.: `5519988720017`)
- `VITE_WHATSAPP_DEV_PHONE` (opcional)

## Contato (site)

O footer do site usa:

- `VITE_CONTACT_EMAIL`
- `VITE_CONTACT_PHONE`

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

No Netlify:

- Conecte o site ao branch `main` (recomendado).
- Não use “Base directory” (deixe vazio) para o `netlify.toml` na raiz ser respeitado.
- Variáveis de ambiente: veja `.env.example`.

Para diagnosticar se a galeria está OK em produção, acesse:

- `https://SEU-SITE.netlify.app/api/trpc/gallery.status`

## Google Drive (orçamentos + imagens)

### Imagens/Logo (somente leitura — pasta pública)

Se a pasta estiver pública (“Qualquer pessoa com o link → Leitor”), o site consegue **listar e exibir** as imagens
sem credenciais (modo público).

Por padrão, o projeto já aponta para a pasta:

- `1eb1HNBEMNyWPrTBrtgSUsw3HXA36VnOR`

Se quiser trocar, defina `GOOGLE_DRIVE_IMAGES_FOLDER_ID`.

Coloque um arquivo `logo.png` (ou `logo.jpg/.jpeg/.webp`) dentro da mesma pasta para o header usar automaticamente.

### Orçamentos (escrita — requer autenticação)

Para salvar **orçamentos** como JSON no Drive é necessário autenticação (ou usar banco).
Não existe upload “anônimo” no Drive só por estar público.

Opções suportadas para **salvar orçamentos**:

- **Service Account** (Drive API): configure `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` (recomendado) e compartilhe a pasta como **Editor**.
- **Google OAuth** (Drive API): use `GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN` para salvar usando sua conta Google (útil se aparecer o erro “Service Accounts do not have storage quota”).

Para usar Google Drive API:

- Crie uma **Service Account** no Google Cloud, habilite a **Google Drive API** e gere uma chave.
- No Google Drive, compartilhe a pasta com o **e-mail** da Service Account (permissão de **Editor**).
- Configure no ambiente:
  - `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` (recomendado no Netlify)
  - (ou) `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
  - `GOOGLE_DRIVE_QUOTES_FOLDER_ID` (pasta para JSONs de orçamentos)
  - `GOOGLE_DRIVE_IMAGES_FOLDER_ID` (pasta de imagens)

Padrão de nome recomendado para imagens:

- `001 - toldo-retratil.jpg`
- `002 - cobertura-policarbonato.png`
- `img_1.jpg`, `img_2.png`, `img-003.webp`

O sistema ordena pelo número inicial (quando existir) e usa o resto do nome como título.

## Logo

Por padrão o site usa `client/public/logo.png`.

Se existir um `logo.png` dentro da pasta do Drive configurada, o site prioriza esse logo automaticamente.

Opcionalmente você pode configurar `VITE_LOGO_URL` no `.env` para usar uma URL externa (ex.: Drive/CDN).
