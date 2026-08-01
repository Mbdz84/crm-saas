"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const TABS = [
  { label: "Company", href: "/dashboard/settings" },
  { label: "Job Types", href: "/dashboard/settings/job-types" },
  { label: "Lead Sources", href: "/dashboard/settings/lead-sources" },
  { label: "Technicians / Users", href: "/dashboard/technicians" },
  { label: "Job Status", href: "/dashboard/settings/statuses" },
  { label: "SMS Settings", href: "/dashboard/settings/sms" },
  { label: "Caller IDs", href: "/dashboard/settings/caller-ids" },
  { label: "CRM Settings", href: "/dashboard/settings/crm" },
  { label: "Docs / Guides", href: "/dashboard/settings/docs" },
];

export default function SettingsTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.user || null))
      .catch(() => {});
  }, []);

  const restricted =
    me && (me.role === "technician" || me.role === "dispatcher");

  // Technicians/dispatchers don't get settings — send them to their own profile.
  useEffect(() => {
    if (restricted && me?.id) {
      router.replace(`/dashboard/technicians/${me.id}`);
    }
  }, [restricted, me?.id, router]);

  if (restricted) return null;

  return (
    <div className="border-b mb-4 overflow-x-auto">
      <nav className="flex gap-1 min-w-max">
        {TABS.map((t) => {
          const active =
            t.href === "/dashboard/settings"
              ? pathname === "/dashboard/settings"
              : pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
                active
                  ? "border-blue-600 text-blue-600 font-medium"
                  : "border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
