"use client";

type Tech = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  active: boolean;
  receiveSms: boolean;
  maskedCalls: boolean;
  role: "technician" | "admin";
};

type Props = {
  tech: Tech;
  update: (field: keyof Tech, value: any) => void;
};

export default function ProfileTab({ tech, update }: Props) {
  return (
    <div className="space-y-5">

      {/* NAME */}
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          className="border rounded p-2 w-full"
          value={tech.name || ""}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      {/* EMAIL */}
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          className="border rounded p-2 w-full"
          value={tech.email || ""}
          onChange={(e) => update("email", e.target.value)}
        />
      </div>

      {/* PHONE */}
      <div>
        <label className="block text-sm font-medium mb-1">Phone</label>
        <input
          className="border rounded p-2 w-full"
          value={tech.phone || ""}
          onChange={(e) => update("phone", e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          * Phone will be auto-formatted to +1XXXXXXXXXX on save
        </p>
      </div>

      {/* ACTIVE */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={tech.active}
          onChange={(e) => update("active", e.target.checked)}
        />
        <label className="text-sm">Active Technician</label>
      </div>

      {/* RECEIVE SMS */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={tech.receiveSms}
          onChange={(e) => update("receiveSms", e.target.checked)}
        />
        <label className="text-sm">Receive SMS Notifications</label>
      </div>

      {/* MASKED CALLS */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={tech.maskedCalls}
          onChange={(e) => update("maskedCalls", e.target.checked)}
        />
        <label className="text-sm">Masked Calls Enabled</label>
      </div>

      {/* ROLE */}
      <div>
        <label className="block text-sm font-medium mb-1">Role</label>
        <select
          className="border rounded p-2 w-full"
          value={tech.role}
          onChange={(e) => update("role", e.target.value)}
        >
          <option value="technician">Technician</option>
          <option value="admin">Admin</option>
        </select>
      </div>

    </div>
  );
}