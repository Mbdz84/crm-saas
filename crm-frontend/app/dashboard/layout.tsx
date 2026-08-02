"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar/sidebar";
import Topbar from "@/components/topbar/topbar";
import JobModal from "@/components/JobModal";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden">

      {/* TOP NAVIGATION (nav links + actions) */}
      <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />

      {/* MOBILE SIDEBAR OVERLAY */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* MOBILE SIDEBAR DRAWER */}
      <div
        className={`fixed top-0 left-0 h-[100dvh] w-64 bg-white dark:bg-gray-900 shadow-lg z-50 transform transition-transform duration-300 md:hidden
        ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <Sidebar onNavigate={() => setMobileSidebarOpen(false)} />
      </div>

      {/* PAGE CONTENT — the single vertical scroller */}
      <main className="flex-1 min-h-0 overflow-y-auto sm:p-6 p-3">
        {children}
      </main>

      <JobModal />
    </div>
  );
}
