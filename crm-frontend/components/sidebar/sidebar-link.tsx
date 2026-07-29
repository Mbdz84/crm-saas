"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

interface SidebarLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  collapsed?: boolean;
  onNavigate?: () => void;
  badge?: number;
}


export default function SidebarLink({
  href,
  label,
  icon,
  collapsed = false,
  onNavigate,
  badge = 0,
}: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
  href={href}
  onClick={onNavigate}
  className={clsx(
    "relative flex items-center gap-3 px-4 py-2 rounded-md transition-colors",
    isActive
      ? "bg-blue-600 text-white"
      : "text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800"
  )}
>
      <span className="relative flex-shrink-0">
        {icon}
        {/* Collapsed: small dot on the icon */}
        {collapsed && badge > 0 && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-600" />
        )}
      </span>
      {!collapsed && (
        <span className="text-sm font-medium whitespace-nowrap flex-1">
          {label}
        </span>
      )}
      {/* Expanded: numeric badge */}
      {!collapsed && badge > 0 && (
        <span className="ml-auto text-[10px] font-semibold bg-red-600 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}