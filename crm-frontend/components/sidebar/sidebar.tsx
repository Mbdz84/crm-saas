"use client";

import { useState, useEffect } from "react";
import SidebarLink from "./sidebar-link";
import SidebarSection from "./sidebar-section";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Briefcase,
  Calendar,
  Settings,
  Search,
  MessageSquare,
  BarChart3,
  } from "lucide-react";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [unread, setUnread] = useState(0);
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) setCollapsed(saved === "true");
  }, []);

  // Load the current user's permission flags (to gate nav links).
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) return;
    fetch(`${base}/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.user || null))
      .catch(() => {});
  }, []);

  const isTech = me?.role === "technician";
  const showCalendar = !(isTech && me?.canUseCalendar === false);
  const showReports = !(isTech && me?.canSeeReports === false);

  // Poll unread SMS count for the Chat badge (only while the tab is visible)
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) return;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`${base}/messages/unread-count`, {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          const d = await res.json();
          setUnread(d.inbox || 0);
        }
      } catch {
        /* ignore */
      }
    };
    load();
    const iv = setInterval(load, 20000);
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const toggle = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", newState.toString());
  };

  return (
    <aside
      className={`
        h-screen border-r bg-white dark:bg-gray-900 flex flex-col transition-all duration-300
        ${collapsed ? "w-12" : "w-44"}
      `}
    >
      {/* LOGO */}
      <div className="px-4 mb-6 flex items-center justify-between">
        {!collapsed && (
          <h1 className="text-2xl font-bold transition-opacity">CRM</h1>
        )}
        <button
          onClick={toggle}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 ml-[-8px]"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 space-y-6 overflow-y-auto">
        <SidebarSection title="Main" collapsed={collapsed}>
          <SidebarLink
            href="/dashboard"
            label="Dashboard"
            icon={<Home size={18} />}
            collapsed={collapsed}
          />

          <SidebarLink
            href="/dashboard/jobs"
            label="Jobs"
            icon={<Briefcase size={18} />}
            collapsed={collapsed}
          />

          <SidebarLink
            href="/dashboard/chat"
            label="Chat"
            icon={<MessageSquare size={18} />}
            collapsed={collapsed}
            badge={unread}
          />

          {showCalendar && (
            <SidebarLink
              href="/dashboard/calendar"
              label="Calendar"
              icon={<Calendar size={18} />}
              collapsed={collapsed}
            />
          )}
          <SidebarLink
            href="/dashboard/jobs/search"
            label="Search"
            icon={<Search size={18} />}
            collapsed={collapsed}
          />

          {showReports && (
            <SidebarLink
              href="/dashboard/reports"
              label="Reports"
              icon={<BarChart3 size={18} />}
              collapsed={collapsed}
            />
          )}
        </SidebarSection>
      </nav>

      {/* Bottom links */}
      <SidebarLink
        href="/dashboard/settings"
        label="CRM Settings"
        icon={<Settings size={18} />}
        collapsed={collapsed}
      />
      <SidebarLink
        href="/logout"
        label="Logout"
        icon={<Settings size={18} />}
        collapsed={collapsed}
      />
      {!collapsed && (
        <div className="px-4 text-xs text-gray-500 mt-auto py-4">
          © {new Date().getFullYear()} CRM Platform
        </div>
      )}
    </aside>
  );
}