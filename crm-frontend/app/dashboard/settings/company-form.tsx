"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function CompanyForm() {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState({
    name: "",
    domain: "",
    address: "",
    logoUrl: ""
  });

  // Load company info
  const loadCompany = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/me`, {
      credentials: "include",
    });

    const data = await res.json();
    setCompany(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCompany();
  }, []);

  const onSubmit = async (e: any) => {
    e.preventDefault();

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/update`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(company)
    });

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Update failed");
      return;
    }

    toast.success("Company updated!");
  };

  if (loading) return <p>Loading...</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      <div>
        <label className="font-medium">Company Name</label>
        <input
          className="border p-2 w-full rounded"
          value={company.name}
          onChange={(e) => setCompany({ ...company, name: e.target.value })}
        />
      </div>

      <div>
        <label className="font-medium">Domain</label>
        <input
          className="border p-2 w-full rounded"
          value={company.domain ?? ""}
          onChange={(e) => setCompany({ ...company, domain: e.target.value })}
        />
      </div>

      <div>
        <label className="font-medium">Address</label>
        <input
          className="border p-2 w-full rounded"
          value={company.address ?? ""}
          onChange={(e) => setCompany({ ...company, address: e.target.value })}
        />
      </div>

      <div>
        <label className="font-medium">Logo URL</label>
        <input
          className="border p-2 w-full rounded"
          value={company.logoUrl ?? ""}
          onChange={(e) => setCompany({ ...company, logoUrl: e.target.value })}
        />
      </div>

      {/* Preview */}
      {company.logoUrl && (
        <img
          src={company.logoUrl}
          alt="Logo"
          className="h-16 mt-2 rounded border"
        />
      )}

      <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Save Changes
      </button>
    </form>
  );
}