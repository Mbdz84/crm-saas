"use client";

import { useState } from "react";

/* ------------------------------------------------------------
   DOCS / GUIDES
   Internal how-to guides for operating the CRM. Add new guides to
   the GUIDES list and render them in the switch below.
------------------------------------------------------------ */
const GUIDES = [
  { key: "twilio-source-setup", label: "Twilio Source Setup" },
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
