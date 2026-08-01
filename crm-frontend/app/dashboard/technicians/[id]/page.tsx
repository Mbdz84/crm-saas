"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import PermissionsTab from "./tabs/PermissionsTab";
import FinancialTab from "./tabs/FinancialTab";
import AvailabilityTab from "./tabs/AvailabilityTab";
import MaskedCallSettingsTab from "./tabs/maskedCallSettings";
import { TIMEZONE_OPTIONS } from "@/utils/timezone";

export default function TechnicianProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const API = process.env.NEXT_PUBLIC_API_URL;

  const [tech, setTech] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password reset
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [tab, setTab] = useState<
    "profile" | "permissions" | "financial" | "availability" | "masked-calls"
  >("profile");

  // Viewer (the logged-in user) — technicians/dispatchers get a limited view.
  const [viewer, setViewer] = useState<any>(null);
  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setViewer(d?.user || null))
      .catch(() => {});
  }, []);
  const restricted =
    viewer && (viewer.role === "technician" || viewer.role === "dispatcher");

  // A restricted user may only view their OWN profile.
  useEffect(() => {
    if (restricted && viewer?.id && id && viewer.id !== id) {
      router.replace(`/dashboard/technicians/${viewer.id}`);
    }
  }, [restricted, viewer?.id, id, router]);

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

      setTech(data.tech || data);
    } catch (err) {
      console.error("LOAD TECH ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTech();
  }, []);

  /* ============================================================
     SAFETY: EXIT MASKED TAB IF DISABLED
  ============================================================ */
  useEffect(() => {
    if (!tech?.maskedCalls && tab === "masked-calls") {
      setTab("profile");
    }
  }, [tech?.maskedCalls, tab]);

  /* ============================================================
     SAVE TECHNICIAN
  ============================================================ */
  const saveProfile = async () => {
    setSaving(true);

    const res = await fetch(`${API}/technicians/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...tech,
        maskedTwilioNumberSid: tech.maskedTwilioNumberSid || null,
      }),
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
     SET NEW PASSWORD
  ============================================================ */
  const setUserPassword = async () => {
    if (!newPassword.trim()) return;
    setSavingPassword(true);

    const res = await fetch(`${API}/technicians/${id}/reset-password`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });

    setSavingPassword(false);

    if (res.ok) {
      toast.success("Password updated");
      setNewPassword("");
      setShowPassword(false);
    } else {
      toast.error("Failed to update password");
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
    <div className="p-6 max-w-7xl mx-auto w-full">
      {/* BACK BUTTON */}
      <button onClick={() => router.back()} className="text-blue-600 mb-4">
        ← Back
      </button>

      <h1 className="text-3xl font-semibold mb-6">
        Technician Settings{tech.name ? ` - ${tech.name}` : ""}
      </h1>

      {/* TABS */}
      <div className="flex gap-6 border-b mb-6 pb-2 text-sm">
        <button
          className={tab === "profile" ? "font-bold text-blue-600" : ""}
          onClick={() => setTab("profile")}
        >
          Profile
        </button>

        {/* Admin-only tabs */}
        {!restricted && (
          <>
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

            {tech?.maskedCalls && (
              <button
                className={
                  tab === "masked-calls" ? "font-bold text-blue-600" : ""
                }
                onClick={() => setTab("masked-calls")}
              >
                Masked Calls
              </button>
            )}
          </>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className={tab === "permissions" ? "" : "max-w-xl"}>
        {tab === "profile" && (
          <div className="space-y-6">
            <div>
              <label className="font-medium block mb-1">Name</label>
              <input
                className="w-full border p-2"
                value={tech.name}
                onChange={(e) => setTech({ ...tech, name: e.target.value })}
              />
            </div>

            <div>
              <label className="font-medium block mb-1">Phone</label>
              <input
                className="w-full border p-2"
                value={tech.phone || ""}
                onChange={(e) => setTech({ ...tech, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="font-medium block mb-1">Email</label>
              <input
                className="w-full border p-2"
                value={tech.email}
                onChange={(e) => setTech({ ...tech, email: e.target.value })}
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="font-medium block mb-1">Password</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full border p-2 pr-10"
                    placeholder="Enter a new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={setUserPassword}
                  disabled={savingPassword || !newPassword.trim()}
                  className="px-3 py-2 bg-gray-800 text-white rounded whitespace-nowrap disabled:opacity-50"
                >
                  {savingPassword ? "Saving…" : "Set New Password"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Sets this user&apos;s login password (email + password). Saved
                immediately — separate from Save Changes.
              </p>
            </div>

            {!restricted && (
              <div>
                <label className="font-medium block mb-1">Timezone</label>
                <select
                  className="w-full border p-2"
                  value={tech.timezone || "America/Chicago"}
                  onChange={(e) =>
                    setTech({ ...tech, timezone: e.target.value })
                  }
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Fallback timezone for this tech&apos;s jobs when the address
                  doesn&apos;t resolve one.
                </p>
              </div>
            )}

            {/* Admin-only toggles */}
            {!restricted && (
              <>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={tech.active}
                    onChange={(e) =>
                      setTech({ ...tech, active: e.target.checked })
                    }
                  />
                  Active Technician (shows in the technician dropdown)
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={tech.receiveSms}
                    onChange={(e) =>
                      setTech({ ...tech, receiveSms: e.target.checked })
                    }
                  />
                  Receive SMS
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={tech.maskedCalls}
                    onChange={(e) =>
                      setTech({ ...tech, maskedCalls: e.target.checked })
                    }
                  />
                  Masked Calls + Recording
                </label>
              </>
            )}

            <button
              className="px-3 py-2 bg-blue-600 text-white rounded w-full"
              onClick={saveProfile}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            {!restricted && (
              <button
                className="px-3 py-2 bg-red-500 text-white rounded w-full"
                onClick={deleteTech}
              >
                Delete Technician
              </button>
            )}
          </div>
        )}

        {tab === "permissions" && (
          <PermissionsTab
            tech={tech}
            setTech={setTech}
            save={saveProfile}
            saving={saving}
          />
        )}

        {tab === "financial" && (
          <FinancialTab
            tech={tech}
            setTech={setTech}
            save={saveProfile}
            saving={saving}
          />
        )}

        {tab === "availability" && (
          <AvailabilityTab
            tech={tech}
            reload={loadTech}
            setTech={setTech}
            save={saveProfile}
            saving={saving}
          />
        )}
      </div>

      {/* MASKED CALL SETTINGS (WIDER PANEL) */}
      {tab === "masked-calls" && (
        <div className="max-w-2xl mt-6">
          <MaskedCallSettingsTab
            technician={tech}
            base={API ?? ""}
            onChange={(updates: any) =>
              setTech((prev: any) => ({ ...prev, ...updates }))
            }
          />
        </div>
      )}
    </div>
  );
}