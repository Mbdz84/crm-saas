"use client";

import { useEffect, useState } from "react";
import AddTechModal from "./add-tech-modal";
import { useRouter } from "next/navigation";

export default function TechniciansPage() {
  const [techs, setTechs] = useState([]);
  const router = useRouter();

  const load = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/technicians`, {
      credentials: "include",
    });
    const data = await res.json();
    setTechs(data);
  };

  useEffect(() => {
    load();
  }, []);

  const deleteTech = async (id: string) => {
    if (!confirm("Delete this technician?")) return;

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/technicians/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    load();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Technicians</h1>
        <AddTechModal onAdded={load} />
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Phone</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {techs.map((tech: any) => (
            <tr
              key={tech.id}
              className="border-t hover:bg-gray-100 cursor-pointer"
              onClick={() => router.push(`/dashboard/technicians/${tech.id}`)}
            >
              <td className="py-2 px-4">{tech.name}</td>
              <td className="py-2 px-4">{tech.phone || "-"}</td>
              <td className="py-2 px-4">{tech.email}</td>

              <td className="py-2 px-4 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // prevent row click
                    deleteTech(tech.id);
                  }}
                  className="px-2 py-1 text-sm bg-red-500 text-white rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}