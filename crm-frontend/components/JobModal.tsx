"use client";

import { useEffect, useState } from "react";

export default function JobModal() {
  const [jobId, setJobId] = useState<string | null>(null);

  useEffect(() => {
    function handler(e: any) {
      setJobId(e.detail.jobId);
    }

    window.addEventListener("open-job-modal", handler);
    return () => window.removeEventListener("open-job-modal", handler);
  }, []);

  if (!jobId) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="relative bg-white rounded shadow-xl p-6 w-[900px] max-h-[90vh] overflow-auto">

        {/* Close button */}
        <button
          className="absolute top-4 right-4 text-xl"
          onClick={() => setJobId(null)}
        >
          ✖
        </button>

        {/* 🔥 Correct iframe (inside JOB MODAL) */}
        <iframe
          src={`/jobs/popup/${jobId}`}
          className="w-full h-[80vh] rounded border"
        ></iframe>

      </div>
    </div>
  );
}