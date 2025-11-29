"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LeadSourceProfile() {
  const { id } = useParams();
  const router = useRouter();

  const [source, setSource] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  const base = process.env.NEXT_PUBLIC_API_URL;

  // Load lead source
  const load = async () => {
    try {
      const res = await fetch(`${base}/lead-sources/${id}`, {
        credentials: "include",
      });

      const data = await res.json();
      setSource(data);
      setName(data.name);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load lead source");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  // Save name
  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${base}/lead-sources/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) throw new Error();
      toast.success("Updated");
      load();
    } catch {
      toast.error("Failed to update");
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

      if (!res.ok) throw new Error();
      toast.success("Lead source deleted");
      router.push("/dashboard/settings/lead-sources");
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!source) return <div className="p-6">Lead source not found</div>;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          Lead Source: {source.name}
        </h1>

        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-800"
        >
          Back
        </button>
      </div>

      {/* Edit block */}
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 space-y-4">
        <div>
          <label className="text-sm font-medium">Lead Source Name</label>
          <input
            className="mt-1 w-full border rounded p-2 dark:bg-gray-800"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex justify-between pt-4">
          <button
            onClick={deleteSource}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Delete
          </button>

          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}