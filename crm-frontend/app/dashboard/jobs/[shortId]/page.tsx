"use client";

import { JobProvider, useJob } from "./state/JobProvider";

import TabsHeader from "./ui/TabsHeader";
import OverviewTab from "./ui/OverviewTab";
import LogsTab from "./ui/LogsTab";
import RecordingsTab from "./ui/RecordingsTab";
import InvoiceTab from "./ui/InvoiceTab";

function JobContent() {
  const { tab, setTab, job, loading } = useJob();

  if (loading || !job) {
    return <div className="p-6">Loading job...</div>;
  }

  return (
    <div className="py-6 px-0.5 md:px-6 max-w-[61rem] mx-auto space-y-6">
      <TabsHeader tab={tab} setTab={setTab} />
      {tab === "overview" && <OverviewTab />}
      {tab === "log" && <LogsTab />}
      {tab === "recordings" && <RecordingsTab />}
      {tab === "invoice" && <InvoiceTab />}
    </div>
  );
}

export default function JobPage() {
  return (
    <JobProvider>
      <JobContent />
    </JobProvider>
  );
}