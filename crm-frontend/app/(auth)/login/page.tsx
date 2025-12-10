"use client";

import { useEffect, useState } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  const [dark, setDark] = useState(false);

  // Load saved theme or system preference
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark =
      saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;

    setDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  function toggleTheme() {
    const newVal = !dark;
    setDark(newVal);
    document.documentElement.classList.toggle("dark", newVal);
    localStorage.setItem("theme", newVal ? "dark" : "light");
  }

  return (
    <div className="min-h-screen flex items-center justify-center 
                    bg-gray-100 dark:bg-gray-900 p-4 transition-colors duration-300">

      <div className="w-full max-w-md 
                      bg-white dark:bg-gray-800 
                      shadow p-8 rounded-md 
                      border dark:border-gray-700 
                      transition-colors duration-300">

        <h1 className="text-2xl font-bold mb-6 text-center
                       text-gray-900 dark:text-gray-100">
          CRM Login
        </h1>

        {/* LOGIN FORM */}
        <LoginForm />

        {/* DARK MODE TOGGLE UNDER LOGIN */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={toggleTheme}
            className="px-4 py-2 text-sm rounded-full border 
                       bg-gray-100 dark:bg-gray-700 
                       text-gray-700 dark:text-gray-300
                       border-gray-300 dark:border-gray-600
                       hover:bg-gray-200 dark:hover:bg-gray-600
                       transition-all"
          >
            {dark ? "🌙 Dark Mode Enabled" : "☀️ Light Mode Enabled"}
          </button>
        </div>
      </div>
    </div>
  );
}