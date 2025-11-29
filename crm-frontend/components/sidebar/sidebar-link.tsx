"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

interface SidebarLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  collapsed?: boolean;
}

export default function SidebarLink({
  href,
  label,
  icon,
  collapsed = false,
}: SidebarLinkProps) {
  const pathname = usePathname();

  // FIXED ACTIVE LOGIC — only activate exact match
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 px-4 py-2 rounded-md transition-colors overflow-hidden",
        isActive
          ? "bg-blue-600 text-white"
          : "text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800"
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="font-medium whitespace-nowrap">{label}</span>}
    </Link>
  );
}