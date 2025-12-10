"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TechniciansPage() {
  const router = useRouter();
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6">
      {/* HEADER + Create Button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold">Technicians</h1>

        <button
          onClick={() => router.push("/dashboard/technicians/new")}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-500"
        >
          + New Technician
        </button>
      </div>

      <table className="w-full border">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Phone</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Active</th>
          </tr>
        </thead>

        <tbody>
          {techs?.map?.((t) => (
            <tr
              key={t.id}
              onClick={() => router.push(`/dashboard/technicians/${t.id}`)}
              className="cursor-pointer hover:bg-gray-100 transition"
            >
              <td className="p-2">{t.name}</td>
              <td className="p-2">{t.phone}</td>
              <td className="p-2">{t.email}</td>
              <td className="p-2">
                {t.active ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-red-600">Inactive</span>
                )}
              </td>
            </tr>
          ))}

          {techs.length === 0 && (
            <tr>
              <td colSpan={4} className="p-4 text-center text-gray-500">
                No technicians found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}