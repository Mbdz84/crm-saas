"use client";

import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white shadow p-8 rounded-md">
        <h1 className="text-2xl font-bold mb-6 text-center">CRM Login</h1>
        <LoginForm />
      </div>
    </div>
  );
}