# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Monorepo with three independent parts (no root package.json / workspace tooling):

- `crm-backend/` — Express + TypeScript REST API, Prisma ORM over PostgreSQL.
- `crm-frontend/` — Next.js 16 App Router (React 19, Tailwind v4, shadcn/ui).
- `supabase/functions/` — a Deno edge function (`send-job-reminders`), an alternate implementation of the backend reminder cron.

This is a **multi-tenant field-service CRM**: companies dispatch jobs to technicians, and each job is "closed" with a payment split between technician, lead source, and company.

## Commands

Run these from inside the relevant sub-project directory.

### Backend (`crm-backend/`)
- `npm run dev` — nodemon + ts-node on `src/server.ts` (port 8080).
- `npm run build` — `tsc` → `build/`.
- `npm start` — run compiled `build/server.js`.
- `npx prisma migrate dev` (or `npm run prisma:migrate`) — apply/create migrations.
- `npx prisma generate` — regenerate the Prisma client after editing `schema.prisma`.
- `npx prisma studio` — DB browser.
- `npx ts-node prisma/seed.ts` — seed data.

### Frontend (`crm-frontend/`)
- `npm run dev` — Next dev server (port 3000).
- `npm run build` / `npm start` — production build / serve.
- `npm run lint` — ESLint (`eslint-config-next`).

There is **no test framework** configured in either package.

## Backend architecture

- **Entry**: `src/server.ts` boots the app and schedules a `node-cron` job every 10 minutes calling `processJobReminders` (`modules/reminders/reminder.cron.ts`). `src/app.ts` wires all middleware and routes.
- **Feature modules** live in `src/modules/<feature>/` as `*.routes.ts` + `*.controller.ts`. `app.ts` mounts each router under its path prefix.
- **Auth & tenancy**: `middleware/auth.ts` reads the JWT from the `token` httpOnly cookie and populates `req.user` (`id`, `companyId`, `role`). `middleware/tenant.ts` then sets `req.tenantId = req.user.companyId`. Protected routes are mounted as `app.use("/x", authMiddleware, tenantMiddleware, xRoutes)`. **All tenant isolation is enforced by filtering queries on `companyId`** — there is no row-level security, so any new query touching tenant data must scope by `companyId`.
- **External ingest**: `middleware/apiKeyAuth.ts` authenticates third parties by hashing the bearer token and matching `LeadSource.apiKeyHash`; it attaches `req.leadSource` / `req.company`. Used by `POST /api/ingest/job`.
- **Middleware ordering matters** in `app.ts`: `bodyParser.urlencoded` is registered **first** because Twilio webhooks post `x-www-form-urlencoded`. Twilio SMS (`/twilio/sms`) and Voice (`/twilio`) routes are mounted before JSON/auth middleware. Recent bugs came from disturbing this ordering — preserve it.
- **Jobs module** (`modules/jobs/`) uses a one-file-per-action pattern under `actions/` (`create`, `close`, `parse`, `duplicate`, `reopen`, `recordings`, `sms`, …), re-exported through `jobs/index.ts` and wired in `jobs/job.routes.ts`. In `job.routes.ts`, **literal routes (`/parse`, `/create-from-parse`, `/search`) must be declared before `:shortId` routes** or they get shadowed. Jobs are addressed publicly by **`shortId`**, not the cuid `id`.
- **Job closing / payments** is the domain-critical logic: `JobClosing` (see `prisma/schema.prisma`) stores a full breakdown of totals, parts, fees, percentages, and per-party balances. `close.controller.ts` persists it and `modules/jobs/utils/payments.ts` (`calcPaymentTotals`) aggregates payments by method (cash/credit/check/zelle). Much of the split math is computed on the frontend and sent in the close request body.
- **AI parsing**: `jobs/actions/parse.controller.ts` + `parse.helper.ts` call OpenAI to extract structured job fields (name, phones, address, job type) from free-text messages.
- **Prisma client** is a singleton exported from `src/prisma/client.ts`; import it, don't instantiate `PrismaClient` per-request.

## Frontend architecture

- App Router under `app/`. Route groups: `(auth)/login` and the authenticated `dashboard/*` (jobs, calendar, reports, technicians, users, settings). `app/jobs/popup/` is a standalone screen-pop view (e.g. incoming-call context).
- `proxy.ts` (matcher on `/dashboard/*` and `/login`) redirects based on presence of the `token` cookie — logged-out users hitting the dashboard go to `/login`, and vice-versa.
- Components fetch the backend directly at `${process.env.NEXT_PUBLIC_API_URL}` with `credentials: "include"` so the JWT cookie is sent. There is no shared API-client wrapper — each component calls `fetch` inline.
- UI is shadcn/ui (`components.json`, "new-york" style) in `components/ui/`; utility `cn` in `lib/utils.ts`; icons from `lucide-react`; toasts from `sonner`. Address entry uses Google Maps Places (`components/GoogleAddressInput.tsx`, key `NEXT_PUBLIC_GOOGLE_MAPS_KEY`).

## Integrations & cron

- **Twilio** — inbound SMS (AI-parsed into jobs) and voice, plus outbound technician notifications and job reminders.
- **OpenAI** — free-text → structured job parsing.
- **Reminders** run two ways: the in-process `node-cron` in `server.ts`, and the Supabase edge function `supabase/functions/send-job-reminders/index.ts`. If you change reminder behavior, check whether both need updating.

## Deployment

- Backend deploys as a Docker image to **Google Cloud Run** via `crm-backend/cloudbuild.yaml` (image `api-moriel-work`); the multi-stage `Dockerfile` runs `prisma generate` then `tsc`. Prod domains: frontend `app.moriel.work`, backend `api.moriel.work` (both allow-listed in the backend CORS config in `app.ts`).

## Environment variables

- Backend: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `OPENAI_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (+ Twilio numbers).
- Frontend: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY`.
