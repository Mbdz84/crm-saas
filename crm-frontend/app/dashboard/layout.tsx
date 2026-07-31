"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar/sidebar";
import Topbar from "@/components/topbar/topbar";
import JobModal from "@/components/JobModal";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">

      {/* DESKTOP SIDEBAR — fixed, scrolls on its own if tall */}
      <div className="hidden md:block h-screen overflow-y-auto shrink-0">
        <Sidebar />
      </div>

      {/* MOBILE SIDEBAR OVERLAY */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* MOBILE SIDEBAR DRAWER */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 shadow-lg z-50 transform transition-transform duration-300 md:hidden
        ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <Sidebar />
      </div>

      {/* MAIN AREA — the single vertical scroller (includes the Topbar) */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-y-auto">

        {/* TOPBAR */}
        <Topbar />

        {/* MOBILE MENU BUTTON (in top-left overlay on content) */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden fixed bottom-3 right-3 z-50 p-2 bg-gray-800 text-white rounded-lg shadow-lg"
        >
          ☰
        </button>

        {/* PAGE CONTENT */}
        <main className="flex-1 sm:p-6 p-3">
          {children}
        </main>

        <JobModal />
      </div>
    </div>
  );
}