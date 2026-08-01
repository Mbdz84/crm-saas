"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

const base = process.env.NEXT_PUBLIC_API_URL;

interface CallerId {
  id: string;
  number: string;
  name: string;
}

function fmtPhone(n?: string) {
  const d = (n || "").replace(/[^\d]/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return n || "";
}

export default function CallerIdsPage() {
  const [list, setList] = useState<CallerId[]>([]);
  const [loading, setLoading] = useState(true);
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState("");
  const [editName, setEditName] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/caller-ids`, { credentials: "include" });
      if (res.ok) setList(await res.json());
    } catch {
      toast.error("Failed to load caller IDs");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!number.trim() || !name.trim())
      return toast.error("Number and name required");
    setSaving(true);
    try {
      const res = await fetch(`${base}/caller-ids`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, name }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || "Failed to save");
      toast.success("Saved");
      setNumber("");
      setName("");
      load();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: CallerId) => {
    setEditingId(c.id);
    setEditNumber(c.number);
    setEditName(c.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNumber("");
    setEditName("");
  };

  const saveEdit = async (id: string) => {
    if (!editNumber.trim() || !editName.trim())
      return toast.error("Number and name required");
    try {
      const res = await fetch(`${base}/caller-ids/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: editNumber, name: editName }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || "Failed to update");
      toast.success("Updated");
      cancelEdit();
      load();
    } catch {
      toast.error("Failed to update");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this caller ID?")) return;
    try {
      const res = await fetch(`${base}/caller-ids/${id}`, {
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

  return (
    <div className="p-6 max-w-3xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Caller IDs</h1>
        <p className="text-sm text-gray-500">
          Save a name for a phone number, and it will show next to that number
          in call recordings.
        </p>
      </div>

      {/* ADD */}
      <div className="border rounded p-4 bg-white dark:bg-gray-900 flex flex-col sm:flex-row gap-3">
        <input
          className="border p-2 rounded flex-1 dark:bg-gray-800"
          value={number}
          placeholder="Phone number (e.g. 7735551234)"
          onChange={(e) => setNumber(e.target.value)}
        />
        <input
          className="border p-2 rounded flex-1 dark:bg-gray-800"
          value={name}
          placeholder="Name (e.g. Jimmy)"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add"}
        </button>
      </div>

      {/* LIST */}
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-gray-400 text-sm">No caller IDs saved yet.</p>
      ) : (
        <div className="space-y-2">
          {list.map((c) => (
            <div
              key={c.id}
              className="border rounded p-3 bg-white dark:bg-gray-900 flex justify-between items-center gap-3"
            >
              {editingId === c.id ? (
                <>
                  <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
                    <input
                      className="border p-2 rounded flex-1 dark:bg-gray-800"
                      value={editNumber}
                      onChange={(e) => setEditNumber(e.target.value)}
                    />
                    <input
                      className="border p-2 rounded flex-1 dark:bg-gray-800"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(c.id)}
                    />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => saveEdit(c.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="min-w-0">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {fmtPhone(c.number)}
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(c)}
                      className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
