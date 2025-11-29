"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TechnicianProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [tech, setTech] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;

  /* ============================================================
     LOAD TECHNICIAN
  ============================================================ */
  const load = async () => {
    try {
      const res = await fetch(`${API}/technicians/${id}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) return;

      setTech(data);
    } catch (err) {
      console.error("LOAD TECH ERROR:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /* ============================================================
     SAVE CHANGES
  ============================================================ */
  const saveChanges = async () => {
    setSaving(true);

    const res = await fetch(`${API}/technicians/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: tech.name,
        phone: tech.phone,
        email: tech.email,
        active: tech.active,
        maskedCalls: tech.maskedCalls, // ⭐ NEW FIELD
      }),
    });

    setSaving(false);
    if (res.ok) {
      alert("Technician updated!");
      load();
    } else {
      alert("Failed to update");
    }
  };

  /* ============================================================
     DELETE TECH
  ============================================================ */
  const deleteTech = async () => {
    if (!confirm("Delete this technician?")) return;

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
    <div className="p-6 max-w-xl space-y-6">
      <button onClick={() => router.back()} className="text-blue-600">
        ← Back
      </button>

      <h1 className="text-3xl font-semibold">Edit Technician</h1>

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
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={tech.active}
          onChange={(e) => setTech({ ...tech, active: e.target.checked })}
        />
        <span>Active Technician</span>
      </div>

      {/* ⭐ NEW — MASKED CALLS CHECKBOX */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={tech.maskedCalls || false}
          onChange={(e) =>
            setTech({ ...tech, maskedCalls: e.target.checked })
          }
        />
        <span>Masked Calls + Recording (Twilio bridge mode)</span>
      </div>

      {/* SAVE BUTTON */}
      <button
        disabled={saving}
        onClick={saveChanges}
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
  );
}