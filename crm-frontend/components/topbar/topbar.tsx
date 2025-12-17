"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { useRouter } from "next/navigation";

export default function Topbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const { theme, toggleTheme } = useTheme();
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
  const load = async () => {
    try {
      // Load company
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/me`,
        { credentials: "include" }
      );
      const companyData = await res.json();
      setCompany(companyData);

      // Load logged-in user (CORRECT ENDPOINT)
      const userRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/me`,
        { credentials: "include" }
      );
      const userData = await userRes.json();
      console.log("USER DATA:", userData);

      // `me()` returns: { user: {...} }
      setUser(userData.user);

    } catch (err) {
      console.error("Failed to load company or user", err);
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
          className="px-3 py-1.5 bg-orange-500 text-white rounded hover:bg-green-700 transition text-sm"
        >
          Jobs
        </button>

        <button
          onClick={() => router.push("/dashboard/jobs/new")}
          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
        >
          New Job
        </button>
        <button
          onClick={() => router.push("/dashboard/jobs/add")}
          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
        >SMS Parse</button>
      </div>

      {/* RIGHT SIDE — Theme toggle + Company */}
      <div className="flex items-center gap-3">

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
 {/* User Info */}
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {user?.name} ({user?.role})
          </span>
        </div>
        {/* Company Name */}
        <span className="font-medium">{company?.name}</span>
      </div>
    </div>
  );
}