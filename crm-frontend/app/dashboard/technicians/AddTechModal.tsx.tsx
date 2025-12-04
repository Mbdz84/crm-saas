"use client";

import { useState } from "react";
import { toast } from "sonner";

interface AddTechModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export default function AddTechModal({ onClose, onSaved }: AddTechModalProps) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "technician",
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.email || !form.password || !form.name) {
      return toast.error("Required fields missing");
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/technicians`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast.success("Technician created");
      onClose();
      onSaved();
    } else {
      toast.error("Failed to create tech");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-xl w-full max-w-md space-y-4">

        <h2 className="text-xl font-semibold">Add Technician</h2>

        <div>
          <label className="text-sm">Name</label>
          <input
            className="border rounded p-2 w-full"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Email</label>
          <input
            className="border rounded p-2 w-full"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Phone</label>
          <input
            className="border rounded p-2 w-full"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Password</label>
          <input
            type="password"
            className="border rounded p-2 w-full"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Save
          </button>
        </div>

      </div>
    </div>
  );
}