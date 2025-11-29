"use client";

import { useJob } from "../state/JobProvider";

export default function LogsTab() {
  const { job, tab } = useJob();

  if (!job || tab !== "log") return null;

  return (
    <div className="mt-6 space-y-4">
      {job.logs?.length ? (
        job.logs.map((log: any) => (
          <div key={log.id} className="p-4 border rounded bg-gray-50">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>
                {new Date(log.createdAt).toLocaleString()}
              </span>
              <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                {log.type === "parsed_sms"
                  ? "🟦 SMS Pasted"
                  : log.type.toUpperCase()}
              </span>
            </div>

            {log.user && (
              <div className="text-xs text-gray-600 mb-1">
                Pasted by: <b>{log.user.name}</b>
              </div>
            )}

            <div className="whitespace-pre-line text-sm bg-white p-2 rounded border">
              {log.text}
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-gray-500">No logs yet.</p>
      )}
    </div>
  );
}