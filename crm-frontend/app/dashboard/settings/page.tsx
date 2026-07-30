"use client";

import { useEffect, useState } from "react";
import OwnersTab from "./owners-tab";

export default function SettingsPage() {
  const [tab, setTab] = useState<"company" | "owners">("company");
  const [company, setCompany] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    logoUrl: "",
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
      logoUrl: data.logoUrl || "",
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

  // Remove logo (clears the URL and saves immediately)
  const removeLogo = async () => {
    const next = { ...form, logoUrl: "" };
    setForm(next);

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });

    load();
  };

  if (!company) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-xl">

      <h1 className="text-2xl font-semibold mb-4">Company Settings</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b mb-6">
        <button
          onClick={() => setTab("company")}
          className={`px-4 py-2 -mb-px border-b-2 ${
            tab === "company"
              ? "border-blue-600 font-semibold"
              : "border-transparent text-gray-500"
          }`}
        >
          Company
        </button>
        <button
          onClick={() => setTab("owners")}
          className={`px-4 py-2 -mb-px border-b-2 ${
            tab === "owners"
              ? "border-blue-600 font-semibold"
              : "border-transparent text-gray-500"
          }`}
        >
          Owners
        </button>
      </div>

      {tab === "owners" && <OwnersTab />}

      {tab === "company" && (
        <>
      {/* Logo */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Company Logo</label>

        {form.logoUrl && (
          <img
            src={form.logoUrl}
            alt="Company logo"
            className="h-20 w-20 rounded-full mb-2 border object-cover"
          />
        )}

        <div className="flex items-center gap-2">
          <input
            className="flex-1 border p-2"
            type="url"
            placeholder="Paste logo image URL (https://...)"
            value={form.logoUrl}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
          />
          {form.logoUrl && (
            <button
              type="button"
              onClick={removeLogo}
              className="px-3 py-2 bg-red-600 text-white rounded whitespace-nowrap"
            >
              Remove logo
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Enter a public image URL, then click Save Changes.
        </p>
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
        </>
      )}
    </div>
  );
}