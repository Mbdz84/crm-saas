"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [company, setCompany] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    notifyTechOnJobCreate: false,
  });

  // Load company settings
  const load = async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/companies/me`,
      { credentials: "include" }
    );
    const data = await res.json();
    setCompany(data);

    setForm({
      name: data.name || "",
      phone: data.phone || "",
      address: data.address || "",
      notifyTechOnJobCreate: data.notifyTechOnJobCreate || false,
    });
  };

  useEffect(() => {
    load();
  }, []);

  // Save updated data
  const save = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    load();
  };

  // Upload logo
  const uploadLogo = async (e: any) => {
    const file = e.target.files[0];
    const fd = new FormData();
    fd.append("logo", file);

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/logo`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });

    load();
  };

  if (!company) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-xl">

      <h1 className="text-2xl font-semibold mb-4">Company Settings</h1>

      {/* Logo */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Company Logo</label>
        {company.logoUrl && (
          <img
            src={company.logoUrl}
            className="h-20 w-20 rounded-full mb-2 border"
          />
        )}
        <input type="file" onChange={uploadLogo} />
      </div>

      {/* Name */}
      <div className="mb-4">
        <label className="block font-medium">Company Name</label>
        <input
          className="w-full border p-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      {/* Phone */}
      <div className="mb-4">
        <label className="block font-medium">Phone</label>
        <input
          className="w-full border p-2"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>

      {/* Address */}
      <div className="mb-4">
        <label className="block font-medium">Address</label>
        <input
          className="w-full border p-2"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </div>

      {/* Technician Notification Toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.notifyTechOnJobCreate}
            onChange={(e) =>
              setForm({
                ...form,
                notifyTechOnJobCreate: e.target.checked,
              })
            }
          />
          <span className="font-medium">
            Send SMS to technician when a job is created
          </span>
        </label>
      </div>

      {/* Save button */}
      <button
        onClick={save}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Save Changes
      </button>
    </div>
  );
}