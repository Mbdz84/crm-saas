"use client";

/* CORRECT PATHS (3 levels up → into dashboard) */
import { JobProvider, useJob } from "../../../dashboard/jobs/[shortId]/state/JobProvider";

import TabsHeader from "../../../dashboard/jobs/[shortId]/ui/TabsHeader";
import OverviewTab from "../../../dashboard/jobs/[shortId]/ui/OverviewTab";
import LogsTab from "../../../dashboard/jobs/[shortId]/ui/LogsTab";
import RecordingsTab from "../../../dashboard/jobs/[shortId]/ui/RecordingsTab";

function JobContent() {
  const { tab, setTab, job, loading } = useJob();

  if (loading || !job) {
    return <div className="p-6 text-center">Loading job…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <TabsHeader tab={tab} setTab={setTab} />

      {tab === "overview" && <OverviewTab />}
      {tab === "log" && <LogsTab />}
      {tab === "recordings" && <RecordingsTab />}
    </div>
  );
}

export default function JobView({
  shortId,
  modal = false,
}: {
  shortId: string;
  modal?: boolean;
}) {
  return (
    <div className={modal ? "p-2 bg-white rounded shadow max-w-4xl mx-auto" : ""}>
      <JobProvider customJobId={shortId}>
        <JobContent />
      </JobProvider>
    </div>
  );
}