import Sidebar from "@/components/sidebar/sidebar";
import Topbar from "@/components/topbar/topbar";
import JobModal from "@/components/JobModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full overflow-y-auto">

      {/* Sidebar stays same logic-wise, just responsive */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-h-screen overflow-y-auto gap-4">
        <Topbar />

        <main className="p-6 flex-1 overflow-y-auto sm:p-6 p-3">
          {children}
        </main>

        <JobModal />
      </div>

    </div>
  );
}