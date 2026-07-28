# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in `crm-frontend/`. For the backend API and repo-wide context, see the root `../CLAUDE.md`.

This is the **Next.js 16 App Router** frontend (React 19, TypeScript, Tailwind v4, shadcn/ui) for a multi-tenant field-service CRM. It is a thin client: it holds no database and talks to the Express backend over HTTP.

## Commands

- `npm run dev` — dev server on port 3000.
- `npm run build` / `npm start` — production build / serve.
- `npm run lint` — ESLint (`eslint-config-next`). No test framework is configured.

## Talking to the backend

- Every data call is an inline `fetch` to `` `${process.env.NEXT_PUBLIC_API_URL}/...` `` with **`credentials: "include"`** so the httpOnly `token` cookie (the JWT) is sent. There is **no shared API-client wrapper** — each component/page fetches directly, so patterns are copy-pasted rather than centralized.
- Jobs are addressed by **`shortId`** (uppercased before use), not a numeric id.
- Required env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY`.

## Routing & auth gate

- App Router under `app/`. Route groups: `(auth)/login` (public) and `dashboard/*` (authenticated: jobs, calendar, reports, technicians, users, settings). `app/jobs/popup/` is a standalone screen-pop window (incoming-call context), separate from the dashboard shell.
- **`proxy.ts` at the project root is the active auth middleware** (Next.js 16 renamed `middleware.ts` → `proxy.ts`). It reads the `token` cookie and redirects: no token + `/dashboard/*` → `/login`; token + `/login` → `/dashboard`. Matcher: `/dashboard/:path*`, `/login`.
- ⚠️ `app/middleware.ts` also exists but is **inactive** — Next.js only runs middleware/proxy from the project root, not inside `app/`. Don't edit it expecting effects; change `proxy.ts` instead. (The two even disagree on redirect target.)
- `app/dashboard/layout.tsx` is the authenticated shell: `Sidebar` + `Topbar` + a globally-mounted `JobModal` (quick job view available across the dashboard).

## Job Details page — the core screen

`app/dashboard/jobs/[shortId]/` is the most complex part of the app and follows a strict separation (see its local `README.md`):

- `page.tsx` — layout and tab wiring only; **no business logic, no fetches, no state**.
- `state/JobProvider.tsx` — a React Context (`useJob`) that owns **all** job state: `job`/`editableJob`, `payments`, split percents (`techPercent`/`leadPercent`/`companyPercent`), parts, fees, lookup lists (job types, statuses, lead sources, techs).
- `state/useJobActions.ts` — all business logic and API calls: `saveChanges` (`PUT /jobs/:shortId`), `closeJob` (`POST /jobs/:shortId/close`), and `calculateSplit`.
- `ui/` — presentational components (`OverviewTab`, `LogsTab`, `RecordingsTab`, `Editable`, …) that read from `useJob()` and call `useJobActions()`.

**The tech/lead/company payment split is computed client-side** in `ui/closing-panel/` (`ClosingPanel` composes `PaymentBlocks`, `PercentagesPanel`, `PartsPanel`, `SummaryPanel`) and the resulting breakdown is POSTed to the backend on close. The backend persists these numbers largely as-received (see backend `close.controller.ts`), so **this UI is the source of truth for the split math** — keep it consistent with the `JobClosing` fields.

## Reports

`app/dashboard/reports/ReportsTable/` is a modularized table:
- `utils/` — `money.ts`, `columnDefs.ts`, `totalsCalculator.ts`, `balanceColor.ts`.
- `exports/` — `exportCSV.ts`, `exportHTML.ts`, `printTable.ts` (PDF via `jspdf` / `jspdf-autotable`).
Canceled-jobs reporting lives in `reports/canceled/`.

## UI conventions

- shadcn/ui ("new-york" style, `components.json`) lives in `components/ui/`; compose with the `cn` helper from `lib/utils.ts`. Icons: `lucide-react`. Toasts: `sonner` (`toast.success/error`).
- Components are overwhelmingly Client Components (`"use client"`) because of the cookie-based fetch pattern and heavy local state.
- Styling is inline Tailwind utility classes with `dark:` variants throughout (no CSS modules). Theme via `components/theme/theme-provider.tsx`.
- Address entry uses Google Maps Places through `components/GoogleAddressInput.tsx`; the Maps script is injected in `app/layout.tsx`. Phone formatting: `utils/formatPhone.ts`.

## Repo cruft — do not treat as source of truth

The tree contains committed scratch/backup artifacts: `*.tsx.zip` snapshots, `ReportsTable_simple_backup.tsx`, `.DS_Store` files, and the `app/test-formula/` scratch pages (experiments for the split formula). These are not live code — ignore them when reasoning about behavior, and prefer the non-backup files.
