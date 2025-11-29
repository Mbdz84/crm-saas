"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { useRouter } from "next/navigation";

export default function Topbar() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/companies/me`,
          { credentials: "include" }
        );
        const data = await res.json();
        setCompany(data);
      } catch (err) {
        console.error("Failed to load company");
      }
    };

    load();
  }, []);

  return (
    <div className="w-full h-16 border-b flex items-center justify-between px-6 bg-white dark:bg-gray-900">

      {/* LEFT SIDE — Dashboard + New Job Button */}
      <div className="flex items-center gap-4">
          <button
          onClick={() => router.push("/dashboard/jobs")}
          className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
        >
          Jobs
        </button>

        <button
          onClick={() => router.push("/dashboard/jobs/new")}
          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
        >
          + New Job
        </button>
        <button
          onClick={() => router.push("/dashboard/jobs/add")}
          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
        >
          + Extract SMS
        </button>
      </div>

      {/* RIGHT SIDE — Theme toggle + Company */}
      <div className="flex items-center gap-3">

        {/* logout Toggle */}
           <button onClick={() => router.push("/logout")}className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-orange-700 transition text-sm">Logout</button>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition"
        >
          {theme === "dark" ? (
            <Sun size={18} className="text-yellow-400" />
          ) : (
            <Moon size={18} className="text-gray-800" />
          )}
        </button>

        {/* Logo */}
        {company?.logoUrl && (
          <img
            src={company.logoUrl}
            className="h-8 w-8 rounded-full border"
            alt="Company logo"
          />
        )}

        {/* Company Name */}
        <span className="font-medium">{company?.name}</span>
      </div>
    </div>
  );
}