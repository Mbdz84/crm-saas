"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL;

/* ------------------------------------------------------------
   OWNERS TAB
   Mark which technicians and lead sources the company owns.
   Their profit is folded into "Company Profit" on the reports
   page (see reports.controller.ts).
------------------------------------------------------------ */
export default function OwnersTab() {
  const [techs, setTechs] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        fetch(`${API}/technicians`, { credentials: "include" }),
        fetch(`${API}/lead-sources`, { credentials: "include" }),
      ]);
      const tData = await tRes.json();
      const sData = await sRes.json();
      setTechs(Array.isArray(tData) ? tData : []);
      setSources(Array.isArray(sData) ? sData : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load owners");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleTech(id: string, isOwner: boolean) {
    setSaving(id);
    setTechs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isOwner } : t))
    );
    try {
      const res = await fetch(`${API}/technicians/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOwner }),
      });
      if (!res.ok) throw new Error();
      toast.success("Saved");
    } catch {
      toast.error("Failed to save — reverting");
      setTechs((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isOwner: !isOwner } : t))
      );
    }
    setSaving(null);
  }

  async function toggleSource(id: string, isOwner: boolean) {
    setSaving(id);
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isOwner } : s))
    );
    try {
      const res = await fetch(`${API}/lead-sources/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOwner }),
      });
      if (!res.ok) throw new Error();
      toast.success("Saved");
    } catch {
      toast.error("Failed to save — reverting");
      setSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isOwner: !isOwner } : s))
      );
    }
    setSaving(null);
  }

  if (loading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-600">
        Mark the technicians and lead sources <b>you own</b>. On the Reports
        page, their profit is added into <b>Company Profit</b> (on top of the
        company&apos;s own split).
      </p>

      {/* TECHNICIANS */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Technicians</h2>
        {techs.length === 0 ? (
          <p className="text-sm text-gray-500">No technicians.</p>
        ) : (
          <div className="border rounded divide-y">
            {techs.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 cursor-pointer"
                  checked={!!t.isOwner}
                  disabled={saving === t.id}
                  onChange={(e) => toggleTech(t.id, e.target.checked)}
                />
                <span>{t.name}</span>
                {t.isOwner && (
                  <span className="ml-auto text-xs font-medium text-green-700">
                    Owner
                  </span>
                )}
              </label>
            ))}
          </div>
        )}
      </section>

      {/* LEAD SOURCES */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Lead Sources</h2>
        {sources.length === 0 ? (
          <p className="text-sm text-gray-500">No lead sources.</p>
        ) : (
          <div className="border rounded divide-y">
            {sources.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 cursor-pointer"
                  checked={!!s.isOwner}
                  disabled={saving === s.id}
                  onChange={(e) => toggleSource(s.id, e.target.checked)}
                />
                <span>{s.name}</span>
                {s.isOwner && (
                  <span className="ml-auto text-xs font-medium text-green-700">
                    Owner
                  </span>
                )}
              </label>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
