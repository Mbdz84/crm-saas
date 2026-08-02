"use client";

import { useState, useEffect } from "react";
import SidebarLink from "./sidebar-link";
import SidebarSection from "./sidebar-section";
import {
  Home,
  Briefcase,
  Calendar,
  Settings,
  Search,
  MessageSquare,
  BarChart3,
  } from "lucide-react";

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  // Mobile-drawer-only sidebar — always expanded (desktop uses the topbar nav).
  const collapsed = false;
  const [unread, setUnread] = useState(0);
  const [me, setMe] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  // Load the current user's permission flags (to gate nav links).
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) return;
    fetch(`${base}/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.user || null))
      .catch(() => {});
    fetch(`${base}/companies/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCompany(d || null))
      .catch(() => {});
  }, []);

  const isTech = me?.role === "technician" || me?.role === "dispatcher";
  const showCalendar = !(isTech && me?.canUseCalendar === false);
  const showReports = !(isTech && me?.canSeeReports === false);
  const showDashboard = !(isTech && me?.canSeeDashboard === false);
  const showChat = !(isTech && me?.canUseChat === false);
  const showSearch = !(isTech && me?.canSeeSearch === false);

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

  return (
    <aside className="h-full w-full border-r bg-white dark:bg-gray-900 flex flex-col">
      {/* LOGO */}
      <div className="px-4 py-4 mb-2">
        <h1 className="text-2xl font-bold">CRM</h1>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 space-y-6 overflow-y-auto">
        <SidebarSection title="Main" collapsed={collapsed}>
          {showDashboard && (
            <SidebarLink
              href="/dashboard"
              label="Dashboard"
              icon={<Home size={18} />}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          )}

          <SidebarLink
            href="/dashboard/jobs"
            label="Jobs"
            icon={<Briefcase size={18} />}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />

          {showChat && (
            <SidebarLink
              href="/dashboard/chat"
              label="Chat"
              icon={<MessageSquare size={18} />}
              collapsed={collapsed}
              badge={unread}
              onNavigate={onNavigate}
            />
          )}

          {showCalendar && (
            <SidebarLink
              href="/dashboard/calendar"
              label="Calendar"
              icon={<Calendar size={18} />}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          )}
          {showSearch && (
          <SidebarLink
            href="/dashboard/jobs/search"
            label="Search"
            icon={<Search size={18} />}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
          )}

          {showReports && (
            <SidebarLink
              href="/dashboard/reports"
              label="Reports"
              icon={<BarChart3 size={18} />}
              collapsed={collapsed}
              onNavigate={onNavigate}
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
        onNavigate={onNavigate}
      />
      <SidebarLink
        href="/logout"
        label="Logout"
        icon={<Settings size={18} />}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />
      {/* Company + logged-in user — mobile only (topbar shows it on desktop) */}
      {!collapsed && (company || me) && (
        <div className="lg:hidden px-4 py-3 border-t leading-tight">
          {company?.name && (
            <div className="text-sm font-semibold truncate">
              {company.name}
            </div>
          )}
          {me && (
            <div className="text-xs text-gray-500 truncate">
              {me.name} ({me.role})
            </div>
          )}
        </div>
      )}

      {!collapsed && (
        <div className="px-4 text-xs text-gray-500 mt-auto py-4">
          © {new Date().getFullYear()} CRM Platform
        </div>
      )}
    </aside>
  );
}