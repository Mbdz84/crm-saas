"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function UserTable() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadUsers = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
      credentials: "include",
    });
    const data = await res.json();

    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateRole = async (id: string, role: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${id}/role`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    toast.success("Role updated");
    loadUsers();
  };

  const toggleActive = async (id: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${id}/active`, {
      method: "PUT",
      credentials: "include",
    });

    toast.success("User status updated");
    loadUsers();
  };

  if (loading) return <p>Loading users...</p>;

  return (
    <table className="w-full border rounded overflow-hidden">
      <thead className="bg-gray-100 dark:bg-gray-800">
        <tr>
          <th className="p-3 text-left">Name</th>
          <th className="p-3 text-left">Email</th>
          <th className="p-3 text-left">Role</th>
          <th className="p-3 text-left">Status</th>
          <th className="p-3 text-left w-20">Actions</th>
        </tr>
      </thead>

      <tbody>
        {users.map((u: any) => (
          <tr
            key={u.id}
            className="border-t hover:bg-gray-100 cursor-pointer"
            onClick={() => router.push(`/dashboard/users/${u.id}`)}
          >
            <td className="p-3">{u.name}</td>
            <td className="p-3">{u.email}</td>
            <td className="p-3">{u.role}</td>
            <td className="p-3">
              {u.active ? (
                <span className="px-2 py-1 bg-green-600 text-white rounded">
                  Active
                </span>
              ) : (
                <span className="px-2 py-1 bg-gray-600 text-white rounded">
                  Disabled
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}