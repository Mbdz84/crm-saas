"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

type TabKey = "profile" | "financial";

export default function LeadSourceProfile() {
  const { id } = useParams();
  const router = useRouter();

  const [source, setSource] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const [tab, setTab] = useState<TabKey>("profile");

  // Profile fields
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6b7280");
  const [active, setActive] = useState(true);
  const [locked, setLocked] = useState(false);

  // Financial defaults (kept as strings in UI)
  const [defaultLeadPercent, setDefaultLeadPercent] = useState("");
  const [defaultAdditionalFee, setDefaultAdditionalFee] = useState("");
  const [defaultCcFeePercent, setDefaultCcFeePercent] = useState("");
  const [defaultCheckFeePercent, setDefaultCheckFeePercent] = useState("");
  const [autoApplyFinancialRules, setAutoApplyFinancialRules] =
    useState(false);

  const base = process.env.NEXT_PUBLIC_API_URL;

   // Incoming SMS numbers
   const [incomingSmsNumbers, setIncomingSmsNumbers] = useState<string[]>([]);

   // Load lead source.
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/lead-sources/${id}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to load lead source");
        setLoading(false);
        return;
      }

      setSource(data);

      // Profile
      setName(data.name ?? "");
      setColor(data.color ?? "#6b7280");
      setActive(data.active ?? true);
      setLocked(data.locked ?? false);

      setIncomingSmsNumbers(data.incomingSmsNumbers ?? []);

      // Financial – Prisma decimals usually come as string
      setDefaultLeadPercent(
        data.defaultLeadPercent != null ? String(data.defaultLeadPercent) : ""
      );
      setDefaultAdditionalFee(
        data.defaultAdditionalFee != null
          ? String(data.defaultAdditionalFee)
          : ""
      );
      setDefaultCcFeePercent(
        data.defaultCcFeePercent != null
          ? String(data.defaultCcFeePercent)
          : ""
      );
      setDefaultCheckFeePercent(
        data.defaultCheckFeePercent != null
          ? String(data.defaultCheckFeePercent)
          : ""
      );
      setAutoApplyFinancialRules(data.autoApplyFinancialRules ?? false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load lead source");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Save name + profile + financial
  const save = async () => {
    setSaving(true);

    const payload: any = {
      name,
      color,
      active,
      locked,
      incomingSmsNumbers: incomingSmsNumbers
        .map(n => n.trim())
        .filter(Boolean),
      autoApplyFinancialRules,
      defaultLeadPercent:
        defaultLeadPercent.trim() === "" ? null : defaultLeadPercent.trim(),
      defaultAdditionalFee:
        defaultAdditionalFee.trim() === ""
          ? null
          : defaultAdditionalFee.trim(),
      defaultCcFeePercent:
        defaultCcFeePercent.trim() === ""
          ? null
          : defaultCcFeePercent.trim(),
      defaultCheckFeePercent:
        defaultCheckFeePercent.trim() === ""
          ? null
          : defaultCheckFeePercent.trim(),
    };

    try {
      const res = await fetch(`${base}/lead-sources/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update");
      }

      toast.success("Lead source updated");
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const deleteSource = async () => {
    if (!confirm("Delete this lead source?")) return;

    try {
      const res = await fetch(`${base}/lead-sources/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete");
      }

      toast.success("Lead source deleted");
      router.push("/dashboard/settings/lead-sources");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to delete");
    }
  };

// ============================
// API KEY ACTIONS (FIXED)
// ============================

const generateApiKey = async () => {
  try {
    const res = await fetch(`${base}/lead-sources/${id}/api-key`, {
      method: "POST",
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Failed to generate API key");
    }

    setNewApiKey(data.apiKey); // ✅ store temporarily
    toast.success("API key generated");

    load(); // refresh last4
  } catch (err: any) {
    console.error(err);
    toast.error(err?.message || "Failed to generate API key");
  }
};

const rotateApiKey = async () => {
  if (!confirm("Rotate API key? Old key will stop working.")) return;
  await generateApiKey();
};

const revokeApiKey = async () => {
  if (!confirm("Revoke API key? This cannot be undone.")) return;

  try {
    const res = await fetch(`${base}/lead-sources/${id}/api-key`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Failed to revoke API key");
    }

    toast.success("API key revoked");
    load();
  } catch (err: any) {
    console.error(err);
    toast.error(err?.message || "Failed to revoke API key");
  }
};


  if (loading) return <div className="p-6">Loading...</div>;
  if (!source) return <div className="p-6">Lead source not found</div>;

  const lockedNote =
    locked &&
    "Locked: name & financial fields are read-only. You can unlock to edit.";

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">
            Lead Source: {source.name}
          </h1>
          {lockedNote && (
            <p className="text-xs text-amber-600 mt-1">{lockedNote}</p>
          )}
        </div>

        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-800"
        >
          Back
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-6 border-b mb-4 pb-2 text-sm">
        <button
          className={
            tab === "profile"
              ? "font-bold text-blue-600 border-b-2 border-blue-600 pb-1"
              : "text-gray-600"
          }
          onClick={() => setTab("profile")}
        >
          Profile
        </button>

        <button
          className={
            tab === "financial"
              ? "font-bold text-blue-600 border-b-2 border-blue-600 pb-1"
              : "text-gray-600"
          }
          onClick={() => setTab("financial")}
        >
          Financial
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 space-y-4">
        {/* PROFILE TAB */}
        {tab === "profile" && (
          <div className="space-y-4">
            {/* NAME */}
            <div>
              <label className="text-sm font-medium">Lead Source Name</label>
              <input
                className="mt-1 w-full border rounded p-2 dark:bg-gray-800"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={locked}
              />
                          </div>

            {/* COLOR */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium">Color</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={locked}
                    className="h-9 w-9 border rounded"
                  />
                  <input
                    className="border rounded p-2 text-sm flex-1 dark:bg-gray-800"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={locked}
                  />
                 </div>
              </div>

              <div className="text-xs text-gray-500 mt-6">
                Used as a tag color on job board / filters.
              </div>
            </div>

            {/* ACTIVE */}
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={locked}
              />
              <span>Active (can be selected for new jobs)</span>
            </label>

            {/* LOCKED */}
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={locked}
                onChange={(e) => setLocked(e.target.checked)}
              />
              <span>Locked (prevent accidental edits / delete)</span>
            </label>
{/* INCOMING SMS NUMBERS */}
<div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 space-y-3">
  <h3 className="text-sm font-semibold">
    Incoming SMS Numbers
  </h3>

  <p className="text-xs text-gray-500">
    SMS from these phone numbers will automatically create jobs.
  </p>

  {incomingSmsNumbers.map((num, index) => (
    <div key={index} className="flex items-center gap-2">
      <input
        className="flex-1 border rounded p-2 text-sm dark:bg-gray-900"
        placeholder="+18475551234"
        value={num}
        disabled={locked}
        onChange={(e) => {
          const copy = [...incomingSmsNumbers];
          copy[index] = e.target.value;
          setIncomingSmsNumbers(copy);
        }}
      />

      {!locked && (
        <button
          type="button"
          onClick={() =>
            setIncomingSmsNumbers(
              incomingSmsNumbers.filter((_, i) => i !== index)
            )
          }
          className="px-2 py-1 text-xs bg-red-600 text-white rounded"
        >
          Delete
        </button>
      )}
    </div>
  ))}

  {!locked && (
    <button
      type="button"
      onClick={() =>
        setIncomingSmsNumbers([...incomingSmsNumbers, ""])
      }
      className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
    >
      + Add Number
    </button>
  )}
</div>


{/* NEW API KEY DISPLAY (shown once) */}
{newApiKey && (
  <div className="border border-green-300 bg-green-50 dark:bg-green-900/20 rounded-lg p-4 space-y-3">
    <p className="text-sm font-semibold text-green-800 dark:text-green-300">
      New API Key (shown once)
    </p>

    <div className="flex items-center gap-2">
      <input
        readOnly
        value={newApiKey}
        className="flex-1 font-mono text-sm border rounded p-2 bg-white dark:bg-gray-900"
      />

      <button
        onClick={async () => {
          await navigator.clipboard.writeText(newApiKey);
          toast.success("API key copied to clipboard");
          setNewApiKey(null); // hide after copy
        }}
        className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-500"
      >
        Copy
      </button>
    </div>

    <p className="text-xs text-gray-600 dark:text-gray-400">
      Store this key securely. You won’t be able to see it again.
    </p>
  </div>
)}

{/* API KEY */}
<div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 mt-6 space-y-2">
  <h3 className="text-sm font-semibold">API Access (Direct JSON)</h3>

  {source.apiKeyLast4 ? (
    <>
      <p className="text-sm">
        API Key:{" "}
        <span className="font-mono text-gray-700 dark:text-gray-300">
          ••••{source.apiKeyLast4}
        </span>
      </p>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={rotateApiKey}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          Rotate Key
        </button>

        <button
          onClick={revokeApiKey}
          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-500"
        >
          Revoke Key
        </button>
      </div>
    </>
  ) : (
    <button
      onClick={generateApiKey}
      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-500"
    >
      Generate API Key
    </button>
  )}

  <p className="text-xs text-gray-500">
    Used for Direct JSON → CRM API ingestion.  
    Keys are shown only once. Store securely.
  </p>
</div>
          </div>
        )}

        {/* FINANCIAL TAB */}
        {tab === "financial" && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              These defaults pre-fill the closing panel when this lead source
              is used. Leave blank to not override anything.
            </p>

            {/* Lead % + Additional Fee */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Default Lead % (e.g. 35)
                </label>
                <input
                  className="mt-1 w-full border rounded p-2 text-sm dark:bg-gray-800"
                  value={defaultLeadPercent}
                  onChange={(e) => setDefaultLeadPercent(e.target.value)}
                  disabled={locked}
                  placeholder="e.g. 35"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Additional Fee ($)
                </label>
                <input
                  className="mt-1 w-full border rounded p-2 text-sm dark:bg-gray-800"
                  value={defaultAdditionalFee}
                  onChange={(e) => setDefaultAdditionalFee(e.target.value)}
                  disabled={locked}
                  placeholder="e.g. 25"
                />
              </div>
            </div>

            {/* CC / Check fees */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Default CC Fee % (credit)
                </label>
                <input
                  className="mt-1 w-full border rounded p-2 text-sm dark:bg-gray-800"
                  value={defaultCcFeePercent}
                  onChange={(e) => setDefaultCcFeePercent(e.target.value)}
                  disabled={locked}
                  placeholder="e.g. 3"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Default Check Fee % (check)
                </label>
                <input
                  className="mt-1 w-full border rounded p-2 text-sm dark:bg-gray-800"
                  value={defaultCheckFeePercent}
                  onChange={(e) => setDefaultCheckFeePercent(e.target.value)}
                  disabled={locked}
                  placeholder="e.g. 2"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm mt-2">
              <input
                type="checkbox"
                checked={autoApplyFinancialRules}
                onChange={(e) =>
                  setAutoApplyFinancialRules(e.target.checked)
                }
                disabled={locked}
              />
              <span>Auto apply these rules in closing panel</span>
            </label>
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex flex-col md:flex-row md:justify-between gap-3 pt-4 border-t mt-4">
          <button
            onClick={deleteSource}
            className="px-4 py-2 bg-red-600 text-white rounded md:w-auto w-full"
          >
            Delete Lead Source
          </button>

          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60 md:w-auto w-full"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}