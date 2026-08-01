"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sun,
  Moon,
  Menu,
  Home,
  Briefcase,
  MessageSquare,
  Calendar,
  Search,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import clsx from "clsx";
import { useTheme } from "@/components/theme/theme-provider";

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const [user, setUser] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [unread, setUnread] = useState(0);

  // "New Job" dropdown (Manually / SMS Parse)
  const [newJobMenuOpen, setNewJobMenuOpen] = useState(false);
  const newJobMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!newJobMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!newJobMenuRef.current?.contains(e.target as Node)) {
        setNewJobMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [newJobMenuOpen]);

  /* Load company + logged-in user (with permission flags) */
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL;
    const load = async () => {
      try {
        const res = await fetch(`${base}/companies/me`, {
          credentials: "include",
        });
        setCompany(await res.json());

        const userRes = await fetch(`${base}/auth/me`, {
          credentials: "include",
        });
        const userData = await userRes.json();
        setUser(userData.user);
      } catch (err) {
        console.error("Failed to load company or user", err);
      }
    };
    load();
  }, []);

  /* Poll unread SMS count for the Chat badge (only while tab is visible) */
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

  /* Permission gating (mirrors the sidebar) */
  const isTech = user?.role === "technician" || user?.role === "dispatcher";
  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <Home size={17} />,
      show: !(isTech && user?.canSeeDashboard === false),
    },
    {
      href: "/dashboard/jobs",
      label: "Jobs",
      icon: <Briefcase size={17} />,
      show: true,
    },
    {
      href: "/dashboard/chat",
      label: "Chat",
      icon: <MessageSquare size={17} />,
      show: !(isTech && user?.canUseChat === false),
      badge: unread,
    },
    {
      href: "/dashboard/calendar",
      label: "Calendar",
      icon: <Calendar size={17} />,
      show: !(isTech && user?.canUseCalendar === false),
    },
    {
      href: "/dashboard/jobs/search",
      label: "Search",
      icon: <Search size={17} />,
      show: !(isTech && user?.canSeeSearch === false),
    },
    {
      href: "/dashboard/reports",
      label: "Reports",
      icon: <BarChart3 size={17} />,
      show: !(isTech && user?.canSeeReports === false),
    },
  ].filter((i) => i.show);

  // Active = the visible item whose href is the longest prefix of the path.
  const activeHref = navItems
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <header className="w-full h-14 border-b flex items-center gap-2 px-3 sm:px-4 bg-white dark:bg-gray-900 shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Brand */}
      <Link
        href="/dashboard/jobs"
        className="font-bold text-lg tracking-tight mr-1"
      >
        CRM
      </Link>

      {/* spacer (centers the nav) */}
      <div className="hidden md:block flex-1" />

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1 min-w-0">
        {navItems.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
              {!!item.badge && item.badge > 0 && (
                <span className="ml-0.5 text-[10px] font-semibold bg-red-600 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* spacer */}
      <div className="flex-1" />

      {/* New Job dropdown — hidden for a technician/dispatcher without create permission */}
      {!(isTech && user?.canCreateJob === false) && (
        <div className="relative" ref={newJobMenuRef}>
          <button
            onClick={() => setNewJobMenuOpen((o) => !o)}
            className="px-2.5 sm:px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition text-xs sm:text-sm whitespace-nowrap flex items-center gap-1"
          >
            New Job <span className="text-[10px]">▾</span>
          </button>

          {newJobMenuOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border rounded-md shadow-lg overflow-hidden z-50">
              <button
                onClick={() => {
                  setNewJobMenuOpen(false);
                  router.push("/dashboard/jobs/new");
                }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Manually
              </button>
              <button
                onClick={() => {
                  setNewJobMenuOpen(false);
                  router.push("/dashboard/jobs/add");
                }}
                className="block w-full text-left px-3 py-2 text-sm border-t hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                SMS Parse
              </button>
            </div>
          )}
        </div>
      )}

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun size={18} className="text-yellow-400" />
        ) : (
          <Moon size={18} className="text-gray-800" />
        )}
      </button>

      {/* Settings (admins) / My Profile (technician & dispatcher) */}
      <Link
        href={
          isTech && user?.id
            ? `/dashboard/technicians/${user.id}`
            : "/dashboard/settings"
        }
        className="hidden md:grid place-items-center p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
        aria-label={isTech ? "My profile" : "Settings"}
      >
        <Settings size={18} />
      </Link>
      <Link
        href="/logout"
        className="hidden md:grid place-items-center p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
        aria-label="Logout"
      >
        <LogOut size={18} />
      </Link>

      {/* Company logo */}
      {company?.logoUrl && (
        <img
          src={company.logoUrl}
          className="hidden sm:block h-8 w-8 rounded-full border"
          alt="Company logo"
        />
      )}

      {/* Company (line 1) + logged-in user (line 2) — desktop only */}
      <div className="hidden lg:flex flex-col items-end leading-tight">
        <span className="text-xs font-semibold whitespace-nowrap">
          {company?.name}
        </span>
        <span className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {user?.name} ({user?.role})
        </span>
      </div>
    </header>
  );
}
