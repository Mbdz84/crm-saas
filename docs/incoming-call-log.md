# Incoming-call log attachment

Attach the recording of a customer's **incoming dispatch call** to the job(s)
that come from it, shown as a box in the job's **Log tab** (From / To /
Duration + audio player).

## Why this is tricky

The customer calls a Twilio number → Twilio Studio forwards to dispatch →
they talk → call ends. Dispatch then **manually** creates the job (usually
1–2 min later; rarely the job is created *before* the call even ends). There
is **no direct link** between the call and the job. The only things that tie
them together are:

- the **caller's phone number**, and
- **time** (the call and the job happen close together).

Everything below is about making that link reliable in both orderings.

## High-level flow

```
Customer → Twilio number → Studio → dispatch phone → call ends
                                 │
                                 ▼  (HTTP Request widget, JSON + secret header)
                         POST /twilio/incoming-call
                                 │
                                 ▼
                         InboundCall row (pending)
                                 │
              ┌──────────────────┴───────────────────┐
   attach to matching jobs now        (no job yet → stays pending)
                                                      │
                              job created later ──────┘  (job-creation hook
                                                          looks back & attaches)
```

**Store-and-match, both directions** — no timing guess / no artificial delay:

- **Call arrives first (normal):** save `InboundCall`, try to attach to any
  matching job in the window; if none exists yet it stays **pending**.
- **Job created first (rare):** the job-creation hook looks back for pending
  `InboundCall`s and attaches them.

## Matching rule

A call attaches to a job when **all** hold:

- same `companyId`
- job `customerPhone` **last-10 digits** == call `from` last-10 (reuse the
  existing format-proof phone match from `search.controller.ts` /
  `twilio.ai.sms.controller.ts`)
- job `createdAt` is within **±24 hours** of the call's `occurredAt`

Attach to **every** matching job (see multiple-jobs below).

### Edge cases this covers

- **Customer called 2–3 times** before the job → each call is its own
  `InboundCall`; all attach to the job → multiple boxes in the log (busy,
  dropped, the real conversation).
- **Dispatch created two jobs by mistake**, both < 24h → the call attaches to
  **both**. Human can later remove it from the wrong one (audit tools).
- **Returning customer** with an old job still open from 3 days ago → that job
  is **outside the 24h window**, so it is skipped; only the new job gets it.
- **Job created before the JSON arrives** → job-first path attaches on arrival.

## Dedup & idempotency

- `InboundCall.callSid` is **unique** — Studio may retry the HTTP request.
- Attachment is a per-job row; a `(jobId, callSid)` pair is written **once**
  (the shared attach helper no-ops if it already exists), so re-processing is
  safe.

## Authentication

The webhook creates log rows, so it must be protected:

- Studio sends header `X-CRM-Secret: <TWILIO_STUDIO_SECRET>`.
- The endpoint rejects (403) anything without the exact secret.
- Use a **new dedicated env var** `TWILIO_STUDIO_SECRET`. Do **not** reuse
  `JWT_SECRET` (auth signing key) or `CRON_SECRET` (reminder cron trigger) —
  different purposes, independently rotatable.

## Cleanup (spam / no-job calls)

A daily task deletes `InboundCall` rows older than **24h** that were never
attached to any job. Piggyback on the existing cron endpoint. (24h matches the
attach window, so there's a single number to reason about.)

## Recordings

- Recordings are **public** (no Twilio credentials needed), e.g.
  `https://api.twilio.com/2010-04-01/Accounts/AC.../Recordings/RE...`
  → the Log-tab player is just `<audio controls src={recordingUrl}>`, reusing
  the `RecordingPlayer` component (with the 1x–3x speed buttons).
- Recordings are kept ~60 days then deleted. If the URL 404s, the player's
  `onError` shows **"Recording no longer available."** — the log row stays.
- Not archival. If permanence is ever needed, download + store in object
  storage (see the separate storage discussion) — out of scope for v1.

## Data model

```prisma
model InboundCall {
  id           String   @id @default(cuid())
  companyId    String
  callSid      String   @unique   // dedup (Studio retries)
  fromNumber   String             // customer
  toNumber     String             // which Twilio number / lead source
  duration     Int?
  recordingUrl String?
  occurredAt   DateTime
  createdAt    DateTime @default(now())
  // "pending" = no attachment yet; cleaned after 24h if never linked
}
```

**Attachment** = one `JobLog` row per job, `type: "incoming_call"`, with the
call details in its metadata/text: `{ callSid, from, to, duration,
recordingUrl }`.

Why per-job rows instead of a join table: the future **"remove from wrong
job"** becomes a one-row delete, **"add to job"** a one-row insert, and the
shared `callSid` lets you find the same call across all jobs for the audit UI.

## Backend

### `POST /twilio/incoming-call` (public, mounted before auth like other `/twilio` routes)

1. Verify `X-CRM-Secret` → 403 if wrong.
2. Resolve `companyId` from `toNumber` (Twilio-number → company/lead-source
   map — see open decisions).
3. Upsert `InboundCall` by `callSid` (idempotent).
4. Find candidate jobs (matching rule above) and, for each not already
   carrying this `callSid`, write the `incoming_call` `JobLog`.
5. Return 200.

### Job-creation hook

After a job is created (**all** create paths: manual create, create-from-parse,
ingest, inbound-SMS auto-create), look back for pending `InboundCall`s: same
company, `fromNumber` last-10 == job phone, `occurredAt` within 24h, not yet
attached to this job → write the `incoming_call` `JobLog` for each.

`#3` and `#4` share one helper `attachInboundCall(job, inboundCall)` that
no-ops when the `(jobId, callSid)` attachment already exists.

### Cleanup task

Daily (via the existing cron endpoint): delete `InboundCall` rows where
`createdAt < now-24h` and no attachment exists.

## Frontend — Log tab

New log type `incoming_call` renders a box:

- **From:** {from}  **To:** {to} (lead source)  **Duration:** {mm:ss}
- `<audio controls>` via `RecordingPlayer` pointed at `recordingUrl`
- `onError` → "Recording no longer available."

## Twilio Studio — HTTP Request widget (after the Connect Call widget)

- **Method:** `POST` → `https://api.moriel.work/twilio/incoming-call`
- **Content-Type:** `application/json`
- **Header:** `X-CRM-Secret: <TWILIO_STUDIO_SECRET>`
- **Body:**

```json
{
  "callSid": "{{widgets.connect_call_1.CallSid}}",
  "from": "{{contact.channel.address}}",
  "to": "{{trigger.call.To}}",
  "duration": "{{widgets.connect_call_1.DialCallDuration}}",
  "recordingUrl": "{{widgets.connect_call_1.RecordingUrl}}"
}
```

(You can keep the existing "text my cell" widget alongside this.)

## Future — audit tools

- **"Add call to job"** — button opens the list of jobs with the same phone;
  pick one → inserts a `JobLog` row.
- **"Remove from this job"** — deletes that one `JobLog` row.

Both are trivial given the per-job-row model.

## Open decisions (to settle at build time)

1. **Secret value/storage:** `TWILIO_STUDIO_SECRET` env var (backend + Studio).
2. **`toNumber` → company / lead-source lookup:** reuse `incomingSmsNumbers`
   on `LeadSource`, or add a parallel `incomingCallNumbers` field. Falls back
   to the default company if unmatched (same pattern as inbound SMS).
