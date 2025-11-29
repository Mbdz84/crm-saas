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
  Users,
  UserCog,
  GitBranch,
  CheckCircle,
} from "lucide-react";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) setCollapsed(saved === "true");
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
            href="/dashboard/calendar"
            label="Calendar"
            icon={<Calendar size={18} />}
            collapsed={collapsed}
          />
        </SidebarSection>

        <SidebarSection title="Company" collapsed={collapsed}>
          <SidebarLink
            href="/dashboard/settings"
            label="Company Profile"
            icon={<Settings size={18} />}
            collapsed={collapsed}
          />

          <SidebarLink
            href="/dashboard/settings/job-types"
            label="Job Types"
            icon={<GitBranch size={18} />}
            collapsed={collapsed}
          />

          <SidebarLink
            href="/dashboard/settings/lead-sources"
            label="Lead Sources"
            icon={<GitBranch size={18} />}
            collapsed={collapsed}
          />

          <SidebarLink
            href="/dashboard/technicians"
            label="Technicians"
            icon={<Users size={18} />}
            collapsed={collapsed}
          />

          <SidebarLink
            href="/dashboard/users"
            label="Users"
            icon={<UserCog size={18} />}
            collapsed={collapsed}
          />
          <SidebarLink
  href="/dashboard/settings/statuses"
  label="Job Status"
  icon={<CheckCircle size={18} />}
  collapsed={collapsed}
/>
<SidebarLink
  href="/dashboard/settings/sms"
  label="SMS Settings"
  icon={<Settings size={18} />}
  collapsed={collapsed}
/>
<SidebarLink
  href="/dashboard/reports"
  label="Reports"
  icon={<Settings size={18} />}
  collapsed={collapsed}
/>
<SidebarLink
  href="/dashboard/settings/crm/"
  label="CRM settings"
  icon={<Settings size={18} />}
  collapsed={collapsed}
/>
        </SidebarSection>
      </nav>

      {!collapsed && (
        <div className="px-4 text-xs text-gray-500 mt-auto py-4">
          © {new Date().getFullYear()} CRM Platform
        </div>
      )}
    </aside>
  );
}