"use client";

import { toast } from "sonner";
import { useEffect, useState } from "react";

export default function JobTypesSettingsPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");

  const loadTypes = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/job-types`, {
      credentials: "include",
    });
    const data = await res.json();
    setTypes(data);
    setLoading(false);
  };

  useEffect(() => {
    loadTypes();
  }, []);

  const addType = async () => {
    if (!newName.trim()) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/job-types`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    if (res.ok) {
      setNewName("");
      loadTypes();
    } else {
      toast.error("Failed to create job type");
    }
  };

  const toggleActive = async (t: any) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/job-types/${t.id}`,
      {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !t.active }),
      }
    );

    if (res.ok) {
      loadTypes();
    } else {
      toast.error("Failed to update job type");
    }
  };

  const deleteType = async (id: string) => {
    if (!confirm("Delete this job type?")) return;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/job-types/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (res.ok) {
      loadTypes();
    } else {
      toast.error("Failed to delete job type");
    }
  };

  if (loading) return <div className="p-6">Loading job types...</div>;

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold mb-2">Job Types</h1>
      <p className="text-sm text-gray-600 mb-4">
        Manage the list of services/job types your dispatchers can select when
        creating a job.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="e.g. Car Lockout, House Lockout, Rekey, Ignition Repair"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          onClick={addType}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Add
        </button>
      </div>

      <table className="w-full border rounded overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-right w-40">Actions</th>
          </tr>
        </thead>
        <tbody>
          {types.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="p-2">{t.name}</td>
              <td className="p-2">
                {t.active ? (
                  <span className="px-2 py-1 text-xs rounded bg-green-600 text-white">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs rounded bg-gray-500 text-white">
                    Inactive
                  </span>
                )}
              </td>
              <td className="p-2 text-right space-x-2">
                <button
                  onClick={() => toggleActive(t)}
                  className="px-2 py-1 text-xs rounded bg-gray-200"
                >
                  {t.active ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => deleteType(t.id)}
                  className="px-2 py-1 text-xs rounded bg-red-500 text-white"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}

          {types.length === 0 && (
            <tr>
              <td className="p-3 text-sm text-gray-500" colSpan={3}>
                No job types yet. Add your first one above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}