"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

/* Avatar color palette — picked deterministically from the name */
const AV_COLORS = [
  "bg-blue-600",
  "bg-violet-600",
  "bg-cyan-600",
  "bg-pink-600",
  "bg-teal-600",
  "bg-orange-500",
  "bg-emerald-600",
];

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

function avatarColor(name?: string) {
  const key = name || "";
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return AV_COLORS[Math.abs(hash) % AV_COLORS.length];
}

export default function TechniciansPage() {
  const router = useRouter();
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL;

  const loadTechs = async () => {
    try {
      const res = await fetch(`${API}/technicians`, {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        console.error("Load techs failed:", data);
        return;
      }

      const list = Array.isArray(data) ? data : data.techs || [];
      setTechs(list);
    } catch (e) {
      console.error("Load techs error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTechs();
  }, []);

  /* Filter + split into Active / Inactive groups */
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? techs.filter((t) =>
          [t.name, t.email, t.phone]
            .filter(Boolean)
            .some((v: string) => v.toLowerCase().includes(q))
        )
      : techs;

    return [
      { label: "Active", items: filtered.filter((t) => t.active) },
      { label: "Inactive", items: filtered.filter((t) => !t.active) },
    ].filter((g) => g.items.length > 0);
  }, [techs, search]);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto w-full">
      {/* HEADER + Create Button */}
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Technicians</h1>

        <button
          onClick={() => router.push("/dashboard/technicians/new")}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 whitespace-nowrap"
        >
          + New Technician
        </button>
      </div>

      {/* SEARCH */}
      <input
        className="border rounded px-3 py-2 w-full md:max-w-md dark:bg-gray-900"
        placeholder="Search name, email, phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* GROUPED DIRECTORY */}
      {groups.length === 0 && (
        <div className="border rounded p-4 text-center text-gray-500">
          No technicians found.
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

          {group.items.map((t) => (
            <div
              key={t.id}
              onClick={() => router.push(`/dashboard/technicians/${t.id}`)}
              className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-full grid place-items-center text-sm font-bold text-white shrink-0 uppercase ${avatarColor(
                  t.name
                )}`}
              >
                {initials(t.name)}
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold flex items-center gap-2">
                  <span className="truncate">{t.name || "No name"}</span>
                  {t.isOwner && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                      Owner
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {[t.email, t.phone].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>

              {/* Masked calls label */}
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                  t.maskedCalls
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                Masked: {t.maskedCalls ? "On" : "Off"}
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
