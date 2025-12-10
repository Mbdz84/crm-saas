"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function NewTechnicianPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    active: true,
  });

  const set = (key: string, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name || !form.email || !form.password) {
      toast.error("Name, email, and password are required.");
      return;
    }

    const res = await fetch(`${API}/technicians`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast.success("Technician created");
      router.push("/dashboard/technicians");
    } else {
      const err = await res.json().catch(() => null);
      toast.error(err?.error || "Failed to create technician");
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto">

      <h1 className="text-2xl font-semibold mb-6">Add Technician</h1>

      <form onSubmit={submit} className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded shadow">

        <div>
          <label className="text-sm mb-1 block">Name</label>
          <input
            className="border rounded p-2 w-full"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm mb-1 block">Email</label>
          <input
            className="border rounded p-2 w-full"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm mb-1 block">Phone</label>
          <input
            className="border rounded p-2 w-full"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm mb-1 block">Password</label>
          <input
            type="password"
            className="border rounded p-2 w-full"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set("active", e.target.checked)}
          />
          <label className="text-sm">Active</label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard/technicians")}
            className="px-4 py-2 bg-gray-300 rounded"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Save Technician
          </button>
        </div>
      </form>
    </div>
  );
}