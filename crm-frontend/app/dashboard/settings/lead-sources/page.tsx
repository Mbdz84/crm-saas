"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

export default function LeadSourcesPage() {
  const router = useRouter();

  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const base = process.env.NEXT_PUBLIC_API_URL;

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/lead-sources`, {
        credentials: "include",
      });
      const data = await res.json();
      setSources(Array.isArray(data) ? data : []);
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

  const smsText = (s: any) =>
    Array.isArray(s.incomingSmsNumbers) && s.incomingSmsNumbers.length > 0
      ? `Incoming SMS: ${s.incomingSmsNumbers.join(", ")}`
      : "No incoming SMS numbers";

  /* Filter + split into Active / Inactive groups */
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? sources.filter((s) =>
          [
            s.name,
            ...(Array.isArray(s.incomingSmsNumbers)
              ? s.incomingSmsNumbers
              : []),
          ]
            .filter(Boolean)
            .some((v: string) => String(v).toLowerCase().includes(q))
        )
      : sources;

    return [
      { label: "Active", items: filtered.filter((s) => s.active !== false) },
      { label: "Inactive", items: filtered.filter((s) => s.active === false) },
    ].filter((g) => g.items.length > 0);
  }, [sources, search]);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto w-full">
      {/* HEADER */}
      <h1 className="text-2xl md:text-3xl font-semibold">Lead Sources</h1>

      {/* ADD NEW */}
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 flex gap-3">
        <input
          className="border p-2 rounded flex-1 dark:bg-gray-800"
          value={newName}
          placeholder="New source name..."
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createSource()}
        />
        <button
          onClick={createSource}
          disabled={creating}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 whitespace-nowrap"
        >
          {creating ? "Adding…" : "Add"}
        </button>
      </div>

      {/* SEARCH */}
      <input
        className="border rounded px-3 py-2 w-full md:max-w-md dark:bg-gray-900"
        placeholder="Search name or SMS number…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* GROUPED DIRECTORY */}
      {groups.length === 0 && (
        <div className="border rounded p-4 text-center text-gray-500">
          No lead sources found.
        </div>
      )}

      {groups.map((group) => (
        <div
          key={group.label}
          className="border rounded-lg bg-white dark:bg-gray-900 overflow-hidden shadow-sm"
        >
          {/* SECTION HEADER */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b text-xs font-semibold uppercase tracking-wide text-gray-500">
            <span>{group.label}</span>
            <span>{group.items.length}</span>
          </div>

          {group.items.map((s) => (
            <div
              key={s.id}
              onClick={() =>
                router.push(`/dashboard/settings/lead-sources/${s.id}`)
              }
              className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              {/* Avatar (lead-source color) */}
              <div
                className="w-9 h-9 rounded-full grid place-items-center text-sm font-bold text-white shrink-0 uppercase"
                style={{ backgroundColor: s.color || "#6b7280" }}
              >
                {initials(s.name)}
              </div>

              {/* Name + incoming SMS */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {s.name || "No name"}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {smsText(s)}
                </div>
              </div>

              {/* Active badge */}
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                  s.active !== false
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {s.active !== false ? "Active" : "Inactive"}
              </span>

              <ChevronRight
                size={18}
                className="text-gray-400 shrink-0 hidden sm:block"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
