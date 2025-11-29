"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LeadSourcesPage() {
  const router = useRouter();

  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const base = process.env.NEXT_PUBLIC_API_URL;

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/lead-sources`, {
        credentials: "include",
      });

      const data = await res.json();
      setSources(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load lead sources");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createSource = async () => {
    if (!newName.trim()) return toast.error("Name required");

    setCreating(true);

    try {
      const res = await fetch(`${base}/lead-sources`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (!res.ok) throw new Error();

      toast.success("Lead source added");
      setNewName("");
      load();
    } catch {
      toast.error("Failed to add");
    } finally {
      setCreating(false);
    }
  };

  const deleteSource = async (id: string) => {
    if (!confirm("Delete source?")) return;

    try {
      const res = await fetch(`${base}/lead-sources/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error();

      toast.success("Deleted");
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* HEADER */}
      <h1 className="text-2xl font-semibold">Lead Sources</h1>

      {/* ADD NEW */}
      <div className="border rounded p-4 bg-white dark:bg-gray-900 flex gap-3">
        <input
          className="border p-2 rounded flex-1 dark:bg-gray-800"
          value={newName}
          placeholder="New source name..."
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          onClick={createSource}
          disabled={creating}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {creating ? "Adding…" : "Add"}
        </button>
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {sources.map((s) => (
          <div
            key={s.id}
            className="border rounded p-4 bg-white dark:bg-gray-900 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
            onClick={() =>
              router.push(`/dashboard/settings/lead-sources/${s.id}`)
            }
          >
            <span className="font-medium">{s.name}</span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSource(s.id);
              }}
              className="px-3 py-2 bg-red-600 text-white rounded"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}