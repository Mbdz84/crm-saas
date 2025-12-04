"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { toast } from "sonner";
import PermissionsTab from "./tabs/PermissionsTab";
import FinancialTab from "./tabs/FinancialTab";
import AvailabilityTab from "./tabs/AvailabilityTab";

export default function TechnicianProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const API = process.env.NEXT_PUBLIC_API_URL;

  const [tech, setTech] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Active tab
  const [tab, setTab] = useState<"profile" | "permissions" | "financial" | "availability">("profile");

  /* ============================================================
     LOAD TECHNICIAN
  ============================================================ */
  const loadTech = async () => {
    try {
      const res = await fetch(`${API}/technicians/${id}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) return;

      setTech(data.tech || data); // backend returns {tech}
    } catch (err) {
      console.error("LOAD TECH ERROR:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadTech();
  }, []);

  /* ============================================================
     SAVE TECHNICIAN
  ============================================================ */
  const saveProfile = async () => {
    setSaving(true);

    const res = await fetch(`${API}/technicians/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tech),
    });

    setSaving(false);

    if (res.ok) {
  toast.success("Technician updated");
  loadTech();
} else {
  toast.error("Failed to update technician");
}
  };

  /* ============================================================
     DELETE TECH
  ============================================================ */
  const deleteTech = async () => {
    if (!confirm("Delete this technician permanently?")) return;

    await fetch(`${API}/technicians/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    router.push("/dashboard/technicians");
  };

  /* ============================================================
     RENDER
  ============================================================ */
  if (loading) return <div className="p-6">Loading...</div>;
  if (!tech) return <div className="p-6">Technician not found.</div>;

  return (
    <div className="p-6">

      {/* BACK BUTTON */}
      <button onClick={() => router.back()} className="text-blue-600 mb-4">
        ← Back
      </button>

      <h1 className="text-3xl font-semibold mb-6">Technician Settings</h1>

      {/* TABS */}
      <div className="flex gap-6 border-b mb-6 pb-2 text-sm">
        <button
          className={tab === "profile" ? "font-bold text-blue-600" : ""}
          onClick={() => setTab("profile")}
        >
          Profile
        </button>

        <button
          className={tab === "permissions" ? "font-bold text-blue-600" : ""}
          onClick={() => setTab("permissions")}
        >
          Permissions
        </button>

        <button
          className={tab === "financial" ? "font-bold text-blue-600" : ""}
          onClick={() => setTab("financial")}
        >
          Financial
        </button>

        <button
          className={tab === "availability" ? "font-bold text-blue-600" : ""}
          onClick={() => setTab("availability")}
        >
          Availability
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="max-w-xl">

        {/* PROFILE TAB */}
        {tab === "profile" && (
          <div className="space-y-6">

            {/* NAME */}
            <div>
              <label className="font-medium block mb-1">Name</label>
              <input
                className="w-full border p-2"
                value={tech.name}
                onChange={(e) => setTech({ ...tech, name: e.target.value })}
              />
            </div>

            {/* PHONE */}
            <div>
              <label className="font-medium block mb-1">Phone</label>
              <input
                className="w-full border p-2"
                value={tech.phone || ""}
                onChange={(e) => setTech({ ...tech, phone: e.target.value })}
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="font-medium block mb-1">Email</label>
              <input
                className="w-full border p-2"
                value={tech.email}
                onChange={(e) => setTech({ ...tech, email: e.target.value })}
              />
            </div>

            {/* ACTIVE */}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={tech.active}
                onChange={(e) => setTech({ ...tech, active: e.target.checked })}
              />
              <span>Active Technician</span>
            </label>

            {/* RECEIVE SMS */}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={tech.receiveSms}
                onChange={(e) => setTech({ ...tech, receiveSms: e.target.checked })}
              />
              <span>Receive SMS</span>
            </label>

            {/* MASKED CALLS */}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={tech.maskedCalls}
                onChange={(e) => setTech({ ...tech, maskedCalls: e.target.checked })}
              />
              <span>Masked Calls + Recording</span>
            </label>
{/* RESET PASSWORD */}
<button
  className="px-3 py-2 bg-orange-500 text-white rounded w-full"
  onClick={async () => {
    const newPass = prompt("Enter new password:");

    if (!newPass) return;

    await fetch(`${API}/technicians/${id}/reset-password`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPass }),
    });

    toast.success("Password reset");
  }}
>
  Reset Password
</button>
            {/* SAVE BUTTON */}
            <button
              disabled={saving}
              onClick={saveProfile}
              className="px-4 py-2 bg-blue-600 text-white rounded w-full"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            {/* DELETE BUTTON */}
            <button
              onClick={deleteTech}
              className="px-4 py-2 bg-red-500 text-white rounded w-full"
            >
              Delete Technician
            </button>
          </div>
        )}

        {/* PERMISSIONS */}
        {tab === "permissions" && (
          <PermissionsTab tech={tech} setTech={setTech} save={saveProfile} saving={saving} />
        )}

        {/* FINANCIAL */}
        {tab === "financial" && (
          <FinancialTab tech={tech} setTech={setTech} save={saveProfile} saving={saving} />
        )}

        {/* AVAILABILITY */}
        {tab === "availability" && (
          <AvailabilityTab tech={tech} reload={loadTech} setTech={setTech} save={saveProfile} saving={saving} />
        )}

      </div>
    </div>
  );
}