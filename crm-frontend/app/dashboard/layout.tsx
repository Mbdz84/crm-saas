import Sidebar from "@/components/sidebar/sidebar";
import Topbar from "@/components/topbar/topbar";
import JobModal from "@/components/JobModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full">

      <Sidebar />

      <div className="flex flex-col flex-1">
        <Topbar />

        <main className="p-6 overflow-y-auto">{children}</main>

        {/* ✅ Mount modal globally */}
        <JobModal />
      </div>

    </div>
  );
}