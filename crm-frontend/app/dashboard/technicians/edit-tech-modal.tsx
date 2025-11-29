"use client";

import { useState } from "react";

export default function EditTechModal({ tech, onUpdated }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: tech.name,
    email: tech.email,
    phone: tech.phone || "",
  });

  const save = async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/users/technicians/${tech.id}`,
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }
    );

    if (res.ok) {
      onUpdated();
      setOpen(false);
    } else {
      alert("Failed to update technician");
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-2 py-1 text-sm bg-gray-200 rounded"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-semibold mb-4">Edit Technician</h2>

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
                onClick={save}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}