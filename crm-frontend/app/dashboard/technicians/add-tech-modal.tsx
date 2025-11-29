"use client";

import { useState } from "react";

export default function AddTechModal({ onAdded }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: ""
  });

  const createTech = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/users/technicians`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    }
  );

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Failed to add technician");
    return;
  }

  onAdded();
  setOpen(false);
  setForm({ name: "", email: "", phone: "" });
};

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Add Technician
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-semibold mb-4">Add Technician</h2>

            <div className="mb-3">
              <label className="block font-medium">Name</label>
              <input
                className="w-full border p-2"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </div>

            <div className="mb-3">
              <label className="block font-medium">Email</label>
              <input
                className="w-full border p-2"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
              />
            </div>

            <div className="mb-3">
              <label className="block font-medium">Phone</label>
              <input
                className="w-full border p-2"
                value={form.phone}
                placeholder="4075551234"
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
              />
            </div>

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={createTech}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}