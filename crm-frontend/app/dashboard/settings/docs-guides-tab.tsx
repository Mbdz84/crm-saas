"use client";

import { useState } from "react";

/* ------------------------------------------------------------
   DOCS / GUIDES
   Internal how-to guides for operating the CRM. Add new guides to
   the GUIDES list and render them in the switch below.
------------------------------------------------------------ */
const GUIDES = [
  { key: "twilio-source-setup", label: "Twilio Source Setup" },
  { key: "add-twilio-number", label: "Add a Twilio Number" },
  { key: "ai-agent-create-job", label: "AI Agent – Create Job (JSON)" },
];

export default function DocsGuidesTab() {
  const [sub, setSub] = useState("twilio-source-setup");

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {GUIDES.map((g) => (
          <button
            key={g.key}
            onClick={() => setSub(g.key)}
            className={`px-3 py-1 text-sm rounded border ${
              sub === g.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {sub === "twilio-source-setup" && <TwilioSourceSetupGuide />}
      {sub === "add-twilio-number" && <AddTwilioNumberGuide />}
      {sub === "ai-agent-create-job" && <AiAgentCreateJobGuide />}
    </div>
  );
}

/* ============================================================
   GUIDE: Twilio Source Setup
============================================================ */
function TwilioSourceSetupGuide() {
  return (
    <div className="text-sm leading-relaxed space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Twilio Source Setup</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Send each incoming call&apos;s recording from a lead source&apos;s
          Twilio Studio flow into the CRM, so it shows up on the matching
          job&apos;s <b>Log</b> tab.
        </p>
      </div>

      <Step n={1} title="Generate an API key for the lead source">
        <p>
          Open the lead source (e.g. <i>NOYS Locksmiths</i>) and click{" "}
          <b>Generate API key</b>. Copy the key (<code>ls_live_…</code>) — it is
          shown only once. Each lead source uses its own key.
        </p>
      </Step>

      <Step n={2} title="Open that lead source's Studio flow">
        <p>
          In the Twilio Console → <b>Studio</b>, open the flow that handles that
          number&apos;s incoming calls.
        </p>
      </Step>

      <Step n={3} title="Add a “Make HTTP Request” widget after the call">
        <p>
          Drag in a <b>Make HTTP Request</b> widget and connect it on the{" "}
          <b>post-call path</b> — after the <b>Connect Call</b> widget finishes.
          It can sit before or after your “text my cell” widget; order
          doesn&apos;t matter, as long as it runs after the call ends (so the
          duration and recording are available).
        </p>
      </Step>

      <Step n={4} title="Configure the widget">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <b>Request method:</b> <code>POST</code>
          </li>
          <li>
            <b>Request URL:</b>{" "}
            <code>https://api.moriel.work/api/ingest/call</code>
          </li>
          <li>
            <b>Content type:</b> <code>Application/JSON</code>
          </li>
          <li>
            <b>Authenticate with Twilio:</b> leave <b>unchecked</b> (that is
            Twilio&apos;s own auth — not ours).
          </li>
        </ul>

        <p className="mt-3">
          <b>Request body</b> — paste this, and put this lead source&apos;s key in{" "}
          <code>apiKey</code>:
        </p>
        <Code>{`{
  "apiKey": "ls_live_THIS_SOURCE_KEY",
  "callSid": "{{widgets.connect_call_1.CallSid}}",
  "from": "{{contact.channel.address}}",
  "to": "{{trigger.call.To}}",
  "duration": "{{widgets.connect_call_1.DialCallDuration}}",
  "recordingUrl": "{{widgets.connect_call_1.RecordingUrl}}"
}`}</Code>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Replace <code>connect_call_1</code> with your actual Connect Call
          widget name if it differs. <code>to</code> is the advertised number
          the client dialed — it shows next to the source on the job log.
        </p>
      </Step>

      <Step n={5} title="Save & publish">
        <p>
          Save the widget and <b>Publish</b> the flow. Repeat steps 1–4 for each
          lead source&apos;s flow (each with its own key).
        </p>
      </Step>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-1">How it lands on a job</h3>
        <p className="text-gray-600 dark:text-gray-300">
          The CRM matches the call to any job with the same phone number created
          within 24 hours (in either direction), and shows a{" "}
          <b>📞 Incoming Call</b> box on that job&apos;s Log tab with From / To /
          Duration and a player. If the client has multiple jobs, it attaches to
          each; use <b>Move to job</b> / <b>Delete</b> on the log entry to fix
          mistakes.
        </p>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-1">Troubleshooting</h3>
        <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
          <li>
            <code>Invalid API key</code> → wrong/placeholder key, or the lead
            source is inactive. Regenerate and update the widget.
          </li>
          <li>
            Nothing on the job → the call number didn&apos;t match a job created
            in the last 24h. The call is held for up to 24h and attaches if a
            job shows up; otherwise it&apos;s cleaned automatically.
          </li>
          <li>
            “Recording no longer available” → the Twilio recording was deleted
            (they&apos;re kept ~60 days). The log entry stays.
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ============================================================
   GUIDE: AI Agent – Create Job from JSON
============================================================ */
function AiAgentCreateJobGuide() {
  return (
    <div className="text-sm leading-relaxed space-y-5">
      <div>
        <h2 className="text-lg font-semibold">AI Agent – Create Job from JSON</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Let a voice AI agent (or any external system) create a job directly by
          POSTing JSON. The job lands on the board with status{" "}
          <b>Accepted</b> and a log entry showing it was created by the AI agent.
        </p>
      </div>

      <div className="rounded border border-gray-200 dark:border-gray-700 p-3 space-y-1">
        <div>
          <b>Endpoint:</b>{" "}
          <code>POST https://api.moriel.work/api/ingest/job</code>
        </div>
        <div>
          <b>Auth:</b> <code>Authorization: Bearer ls_live_…</code> (a lead
          source API key)
        </div>
        <div>
          <b>Content type:</b> <code>Application/JSON</code>
        </div>
      </div>

      <Step n={1} title="Generate an API key for the lead source">
        <p>
          Open the lead source that represents your AI agent (e.g.{" "}
          <i>AI Voice Agent</i>) and click <b>Generate API key</b>. Copy the key
          (<code>ls_live_…</code>) — it is shown only once. This key tells the
          CRM which company the job belongs to.
        </p>
      </Step>

      <Step n={2} title="Point the agent at the endpoint">
        <p>
          Configure your voice agent&apos;s webhook / tool action to send a{" "}
          <b>POST</b> request to{" "}
          <code>https://api.moriel.work/api/ingest/job</code> with these headers:
        </p>
        <Code>{`Authorization: Bearer ls_live_YOUR_SOURCE_KEY
Content-Type: application/json`}</Code>
      </Step>

      <Step n={3} title="Send the job as JSON">
        <p>
          Every field is optional <b>except</b> that you must include at least
          one of <code>customerPhone</code> or <code>customerName</code>.
          Recommended full body:
        </p>
        <Code>{`{
  "origin": "ai_generated",
  "customerName": "John Smith",
  "customerPhone": "+15125551234",
  "customerPhone2": "+15125559999",
  "customerAddress": "123 Main St, Austin, TX 78701",
  "description": "AC not cooling, wants a morning appointment",
  "jobType": "AC Repair",
  "scheduledAt": "2026-08-25T15:00:00Z",
  "timezone": "America/Chicago",
  "externalId": "call_abc123"
}`}</Code>
      </Step>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-1">Field reference</h3>
        <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
          <li>
            <code>origin</code> — set to <code>&quot;ai_generated&quot;</code> so the log
            reads “AI agent created the job.” Defaults to{" "}
            <code>external_api</code> if omitted.
          </li>
          <li>
            <code>customerName</code> / <code>customerPhone</code> — at least one
            is required (otherwise you get <code>400</code>).
          </li>
          <li>
            <code>customerPhone2</code>, <code>customerAddress</code>,{" "}
            <code>description</code> — optional customer details / notes.
          </li>
          <li>
            <code>jobType</code> — must match the <i>name</i> of an active Job
            Type to be linked; otherwise the job is still created (just without a
            type). Also used as the job title (falls back to “New Job”).
          </li>
          <li>
            <code>scheduledAt</code> — ISO 8601 date/time string.
          </li>
          <li>
            <code>timezone</code> — used only if it can&apos;t be derived from
            the address; falls back to the company default.
          </li>
          <li>
            <code>externalId</code> — optional reference (e.g. the call ID) for
            future de-duplication.
          </li>
        </ul>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-1">Response</h3>
        <p className="text-gray-600 dark:text-gray-300">On success:</p>
        <Code>{`{ "success": true, "jobId": "…", "shortId": "…" }`}</Code>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-1">Troubleshooting</h3>
        <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
          <li>
            <code>Missing API key</code> / <code>Invalid API key</code> → the{" "}
            <code>Authorization: Bearer …</code> header is missing, malformed, or
            the lead source is inactive. Regenerate and update it.
          </li>
          <li>
            <code>customerPhone or customerName is required</code> → the body had
            neither. Include at least one.
          </li>
          <li>
            Job created but no type shown → the <code>jobType</code> name
            didn&apos;t match an active Job Type. Check spelling in Settings →
            Job Types.
          </li>
        </ul>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-1">Quick test (curl)</h3>
        <Code>{`curl -X POST https://api.moriel.work/api/ingest/job \\
  -H "Authorization: Bearer ls_live_YOUR_SOURCE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "origin": "ai_generated",
    "customerName": "Jane Doe",
    "customerPhone": "+15125550100",
    "customerAddress": "456 Oak Ave, Dallas, TX",
    "jobType": "Plumbing",
    "description": "Leaking kitchen faucet",
    "scheduledAt": "2026-08-26T14:00:00Z"
  }'`}</Code>
      </div>
    </div>
  );
}

/* ============================================================
   GUIDE: Add a Twilio Number
============================================================ */
function AddTwilioNumberGuide() {
  return (
    <div className="text-sm leading-relaxed space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Add a Twilio Number</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Add a new Twilio number for <b>masked, recorded technician ↔ client
          calls</b>. You point the number&apos;s voice webhook at the CRM, then
          assign it to a technician. The CRM turns on recording automatically —
          there is nothing else to wire up.
        </p>
      </div>

      <div className="rounded border border-gray-200 dark:border-gray-700 p-3 space-y-1">
        <div>
          <b>Voice webhook:</b>{" "}
          <code>POST https://api.moriel.work/twilio/voice</code>
        </div>
        <div>
          <b>SMS webhook (optional):</b>{" "}
          <code>POST https://api.moriel.work/twilio/sms</code>
        </div>
      </div>

      <Step n={1} title="Buy a voice-capable number in Twilio">
        <p>
          Twilio Console → <b>Phone Numbers → Buy a number</b>. Pick any number
          with the <b>Voice</b> capability (add <b>SMS</b> too if this line should
          also receive texts into the CRM).
        </p>
      </Step>

      <Step n={2} title="Point its voice webhook at the CRM">
        <p>
          Open the number in Twilio and set, under <b>Voice Configuration</b> →{" "}
          <b>A call comes in</b>:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <b>Type:</b> <code>Webhook</code>
          </li>
          <li>
            <b>URL:</b> <code>https://api.moriel.work/twilio/voice</code>
          </li>
          <li>
            <b>Method:</b> <code>HTTP POST</code>
          </li>
        </ul>
        <p className="mt-2">
          (Optional) For inbound SMS, set <b>A message comes in</b> to{" "}
          <code>https://api.moriel.work/twilio/sms</code> (POST). Then <b>Save</b>.
        </p>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          You do <b>not</b> need to set a recording callback — the CRM enables
          recording during the call itself.
        </p>
      </Step>

      <Step n={3} title="Assign the number to a technician">
        <p>
          Go to <b>Technicians / Users</b> → open the technician → turn on{" "}
          <b>Masked Calls</b> → open <b>Masked Call Number</b>. Pick the new number
          from the dropdown and click <b>Save Masked Number</b>.
        </p>
      </Step>

      <div className="rounded border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3">
        <b>Why the webhook has to come first:</b> the CRM builds that dropdown by
        reading your Twilio account and listing only numbers whose voice webhook
        points at <code>/twilio/voice</code>. If step 2 isn&apos;t done, the number
        will <b>not appear</b> in step 3.
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-1">How it works</h3>
        <p className="text-gray-600 dark:text-gray-300">
          On a masked call the CRM dials the other party, uses the assigned number
          as the <b>caller ID</b>, and records from ringing. The recording lands on
          the matching job&apos;s <b>Log</b> tab. You never type the number&apos;s
          SID — selecting it in the dropdown links it. Twilio keeps recordings
          ~60 days.
        </p>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-1">Troubleshooting</h3>
        <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300">
          <li>
            <b>Number not in the dropdown</b> / “No Twilio numbers available for
            masked calls” → its voice webhook isn&apos;t set to{" "}
            <code>https://api.moriel.work/twilio/voice</code> (must be <b>POST</b>,
            and the URL must contain <code>/twilio/voice</code>). Fix it in Twilio
            and reload.
          </li>
          <li>
            <b>Masked Call Number section is locked</b> → turn on the{" "}
            <b>Masked Calls</b> toggle for that technician first.
          </li>
          <li>
            <b>Wrong caller ID / not recording</b> → the number isn&apos;t assigned
            to that tech; calls then fall back to the default company number.
          </li>
          <li>
            <b>New number still missing</b> → the list loads up to 50 numbers from
            Twilio; remove unused ones if you&apos;re over that.
          </li>
        </ul>
      </div>
    </div>
  );
}

/* --- small presentational helpers --- */
function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-semibold">
        {n}. {title}
      </h3>
      <div className="mt-1 text-gray-700 dark:text-gray-200">{children}</div>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-1 bg-gray-900 text-gray-100 text-xs rounded p-3 overflow-x-auto">
      <code>{children}</code>
    </pre>
  );
}
