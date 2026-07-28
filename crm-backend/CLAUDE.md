# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in `crm-backend/`. For repo-wide context and the frontend, see the root `../CLAUDE.md`.

This is the **Express + TypeScript** REST API for a multi-tenant field-service CRM, using **Prisma** over **PostgreSQL**. It serves the Next.js frontend and receives webhooks from Twilio.

## Commands

- `npm run dev` — nodemon + ts-node on `src/server.ts` (port 8080).
- `npm run build` — `tsc` → `build/` (`npm start` runs `build/server.js`).
- `npx prisma migrate dev` — create/apply a migration after editing `prisma/schema.prisma`.
- `npx prisma generate` — regenerate the client (also runs in the Docker build).
- `npx prisma studio` — DB browser.
- `npx ts-node prisma/seed.ts` — seed.

No test framework is configured. Money values are Prisma `Decimal` — construct/compare with care, don't assume JS `number`.

## Module structure

- `src/server.ts` — boot + schedules the reminder cron. `src/app.ts` — all middleware wiring and route mounting.
- Feature modules live in `src/modules/<feature>/` as `<feature>.routes.ts` + `<feature>.controller.ts`. `app.ts` mounts each router under a path prefix.
- **The `jobs` module is the exception**: one controller file per action under `modules/jobs/actions/` (`create`, `update`, `close`, `reopen`, `parse`, `duplicate`, `delete`, `get`, `search`, `recordings`, `sms`, `extension`), re-exported through `jobs/index.ts` (a barrel) and wired in `jobs/job.routes.ts`.
- In `job.routes.ts`, **literal routes (`/parse`, `/create-from-parse`, `/search`) must be declared before the `:shortId` routes** or Express shadows them.
- The Prisma client is a **singleton** exported from `src/prisma/client.ts` — import it, never `new PrismaClient()` per request.

## Request context & typing

`src/types/express.d.ts` augments `Express.Request` with `user` (`{ id, companyId, role }`), `tenantId`, and `file`. Controllers read `req.user!.companyId`; the ambient types make this compile without casts.

## Auth, tenancy & the two auth schemes

There are **two independent authentication paths**:

1. **JWT cookie (interactive users)** — `auth.controller.ts` logs in with `bcrypt.compare`, signs `{ userId, companyId, role }`, and sets an **httpOnly cookie `token`**. Cookie flags differ by environment: production uses `secure: true` + `sameSite: "none"` (required because frontend `app.moriel.work` and API `api.moriel.work` are cross-domain); local uses `lax`/non-secure. `middleware/auth.ts` verifies the cookie and populates `req.user`; `middleware/tenant.ts` then sets `req.tenantId = req.user.companyId`. Protected routers mount as `app.use("/x", authMiddleware, tenantMiddleware, xRoutes)`. Roles are plain strings (`"admin"`, `"technician"`); the first registered user of a company becomes `admin`.

2. **API key (external systems)** — `middleware/apiKeyAuth.ts` SHA-256-hashes the bearer token and matches `LeadSource.apiKeyHash`, then attaches `req.leadSource` / `req.company`. Used only by `POST /api/ingest/job`. Keys are minted by `utils/apiKey.ts` (`ls_live_…`), stored as hash + `apiKeyLast4` (raw key shown once).

**Tenant isolation is enforced by scoping every query on `companyId`** — there is no row-level security. New controllers must filter tenant data by `req.user.companyId` (the common pattern is `prisma.job.findFirst({ where: { shortId, companyId } })`).

## Middleware ordering in `app.ts` (do not disturb)

Order is load-bearing:
1. `bodyParser.urlencoded` **first** — Twilio webhooks post `x-www-form-urlencoded`.
2. `bodyParser.json` + `cookieParser`.
3. CORS with an explicit origin allow-list (`app.moriel.work`, `localhost:3000`), `credentials: true`.
4. Twilio routes (`/twilio/sms`, `/twilio/voice`) and `/api/ingest` are mounted **before** the auth-protected routers (they authenticate themselves or not at all).

Recent commits fixed bugs caused by reordering these — preserve the sequence.

## Twilio integration

- **Inbound SMS → auto-created job** (`twilio/twilio.ai.sms.controller.ts`, route `POST /twilio/sms`): matches the sender against `LeadSource.incomingSmsNumbers` to resolve the company/lead source (falls back to the oldest company), runs the AI parser, auto-creates a `JobType` if the parsed type is new, creates the `Job`, and returns empty TwiML. This is a public webhook — no cookie/auth.
- **Inbound voice / masked calls** (`twilio/voice.controller.ts`, routes under `/twilio/voice*` + `/twilio/recording`): per-technician masked caller ID via `User.maskedTwilioNumberSid`; DTMF **extension** routing backed by `JobCallSession` rows; whisper prompts; and a recording webhook that stores `JobRecord`s. `jobs/actions/extension.controller.ts` (`POST /jobs/:shortId/refresh-extension`) regenerates a job's call session, deactivating prior `active` sessions.

## AI parsing

`jobs/actions/parse.helper.ts` (`parseTextWithAI`, uses OpenAI) turns free text into `{ source, customerName, customerPhone, customerPhone2, customerAddress, jobType, description }`. It's shared by the `/jobs/parse` endpoint (frontend) and the inbound-SMS controller. Requires `OPENAI_API_KEY`.

## Jobs domain notes

- **Job identity**: the public identifier is `shortId` (5-char base36, uppercased; `jobs/utils/shortId.ts` guarantees uniqueness). Controllers uppercase incoming `:shortId` params.
- **Two status fields coexist on `Job`**: a free-text `status` string (default `"Accepted"`, validated against `constants/jobStatus.ts`) *and* `statusId` → the `JobStatus` model. Keep them consistent when changing status. Note `JobStatus` is **global** (no `companyId`), whereas `JobType` and `LeadSource` are per-company.
- **Closing / payments**: the tech/lead/company split is computed on the frontend and POSTed to `close.controller.ts` (`POST /jobs/:shortId/close`), which persists it as a `JobClosing`. `jobs/utils/payments.ts` (`calcPaymentTotals`) re-derives per-method totals (cash/credit/check/zelle) server-side.
- **Audit log**: `utils/jobLogger.ts` (`logJobEvent`) writes typed `JobLog` rows and **never throws** (failures are swallowed) — call it on create/update/status-change/close/cancel/reopen so the job history stays complete.
- **File uploads**: `lib/multer.ts` writes to the local `uploads/` dir, served statically at `/uploads`. This is ephemeral disk — it does not persist across Cloud Run instances/deploys.

## Cron / reminders

`server.ts` schedules `processJobReminders` (`modules/reminders/reminder.cron.ts`) every 10 minutes; it self-guards with a `running` flag to avoid overlapping runs, finds due `JobReminder`s, sends SMS, and marks them sent. The Supabase edge function `../supabase/functions/send-job-reminders` is a **parallel implementation** — if you change reminder behavior, check whether both need updating.

## Deployment

Multi-stage `Dockerfile` (node:22-alpine, installs openssl for Prisma, runs `prisma generate` then `tsc`) → **Google Cloud Run** via `cloudbuild.yaml` (image `api-moriel-work`, build context `crm-backend/`). Prod domain `api.moriel.work`.

## Env vars

`DATABASE_URL`, `JWT_SECRET`, `PORT`, `OPENAI_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_NUMBER`.

## Repo cruft — not live code

Ignore these committed artifacts when reasoning about behavior: `src/modules/jobs/controller+routes.zip`, the root SQL scratch files (`delete-jobs.sql`, `add_last_inbound_call_sid.sql`), `migrate-fix.sh`, `.DS_Store` files, and the compiled `build/` output.
