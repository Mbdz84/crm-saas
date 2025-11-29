"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function AddUserModal() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "technician",
  });

  const submit = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast.success("User created");
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "technician" });
    } else {
      toast.error("Failed to create user");
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Add User
      </button>

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow max-w-sm w-full space-y-4">
            <h2 className="text-xl font-semibold">Add User</h2>

            <input
              className="border w-full p-2 rounded dark:bg-gray-800"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <input
              className="border w-full p-2 rounded dark:bg-gray-800"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <input
              type="password"
              className="border w-full p-2 rounded dark:bg-gray-800"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <select
              className="border p-2 rounded dark:bg-gray-800 w-full"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="technician">Technician</option>
            </select>

            <div className="flex justify-between">
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={submit}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}