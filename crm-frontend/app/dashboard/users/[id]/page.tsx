"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function UserProfilePage() {
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/users/${id}`,
      { credentials: "include" }
    );
    const data = await res.json();
    setUser(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });

    alert("User updated!");
  };

  if (loading) return <p className="p-6">Loading...</p>;
  if (!user) return <p className="p-6">User not found</p>;

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">User Profile</h1>

      <div className="space-y-4">

        <div>
          <label className="block font-medium mb-1">Name</label>
          <input
            className="w-full border p-2"
            value={user.name}
            onChange={(e) => setUser({ ...user, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Email</label>
          <input
            className="w-full border p-2"
            value={user.email}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Role</label>
          <select
            className="w-full border p-2"
            value={user.role}
            onChange={(e) => setUser({ ...user, role: e.target.value })}
          >
            <option value="admin">Admin</option>
            <option value="dispatcher">Dispatcher</option>
            <option value="owner">Owner</option>
            <option value="technician">Technician</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Status</label>
          <select
            className="w-full border p-2"
            value={user.active ? "1" : "0"}
            onChange={(e) =>
              setUser({ ...user, active: e.target.value === "1" })
            }
          >
            <option value="1">Active</option>
            <option value="0">Disabled</option>
          </select>
        </div>

        <button
          onClick={save}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}