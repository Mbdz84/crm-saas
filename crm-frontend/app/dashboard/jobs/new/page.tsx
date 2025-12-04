"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import GoogleAddressInput from "@/components/GoogleAddressInput";

interface JobType {
  id: string;
  name: string;
}

interface LeadSource {
  id: string;
  name: string;
}

interface Tech {
  id: string;
  name: string;
  phone?: string | null;
  role: string;
  active: boolean;
}

export default function CreateJobPage() {
  const router = useRouter();

  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // default scheduledAt = now (local) in datetime-local format (not required)
  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const [form, setForm] = useState({
    title: "",
    description: "",
    customerName: "",
    customerPhone: "",
    customerPhone2: "",
    customerAddress: "",
    jobTypeId: "",
    technicianId: "",
    scheduledAt: "",
    sendSmsToTech: true,
    sourceId: "",
  });

  // Load job types + technicians + lead sources
  useEffect(() => {
    const load = async () => {
      const base = process.env.NEXT_PUBLIC_API_URL;

      try {
        // Lead sources
        try {
          const lsRes = await fetch(`${base}/lead-sources`, {
            credentials: "include",
          });
          if (lsRes.ok) setLeadSources(await lsRes.json());
        } catch (e) {
          console.error("Failed to load lead sources", e);
        }

        // Job types
        try {
          const jtRes = await fetch(`${base}/job-types`, {
            credentials: "include",
          });
          if (jtRes.ok) {
            const jtData = await jtRes.json();
            setJobTypes(jtData);
          }
        } catch (e) {
          console.error("Failed to load job types", e);
        }

        // Users -> filter technicians
        try {
          const uRes = await fetch(`${base}/users`, {
            credentials: "include",
          });
          if (uRes.ok) {
            const uData = await uRes.json();
            setTechs(
              uData.filter(
                (u: any) => u.role === "technician" && u.active !== false
              )
            );
          }
        } catch (e) {
          console.error("Failed to load technicians", e);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type, checked } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // basic required fields
    if (!form.customerName || !form.customerPhone || !form.customerAddress) {
      const msg = "Name, phone and address are required.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setSaving(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;

      // Build payload for backend createJob
      const payload: any = {
  title:
    form.title ||
    `${form.customerName}${
      form.jobTypeId
        ? " - " +
          (jobTypes.find((jt: any) => jt.id === form.jobTypeId)?.name || "")
        : ""
    }`,
  description: form.description,
  customerName: form.customerName,
  customerPhone: form.customerPhone,
  customerPhone2: form.customerPhone2 || null,   // ⭐ NEW
  customerAddress: form.customerAddress,
  jobTypeId: form.jobTypeId || null,
  technicianId: form.technicianId || null,
  scheduledAt: form.scheduledAt || null,
  sendSmsToTech: form.sendSmsToTech,
  sourceId: form.sourceId || null,
};

      const res = await fetch(`${base}/jobs`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Failed to create job");
      }

      toast.success("Job created");

      // redirect to job detail page (use shortId only)
      if (data?.job?.shortId) {
        router.push(`/dashboard/jobs/${data.job.shortId}`);
      } else {
        // fallback: go back to job list (should never happen)
        router.push(`/dashboard/jobs`);
      }
    } catch (err: any) {
      console.error("CREATE JOB ERROR", err);
      const msg = err?.message || "Failed to create job";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Create Job</h1>
          <p className="text-gray-500 text-sm">
            New lead / service call → assign technician, send SMS if needed.
          </p>
        </div>

        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-800"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* LEFT COLUMN – Customer Info + Notes */}
        <div className="md:col-span-2 space-y-4">
          {/* Customer block */}
          <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 space-y-3">
            <h2 className="font-semibold text-lg mb-1">Customer Information</h2>

            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium">Name *</label>
                <input
                  name="customerName"
                  className="mt-1 w-full border rounded p-2 dark:bg-gray-800"
                  value={form.customerName}
                  onChange={handleChange}
                />
              </div>

              {/* PHONE 1 */}
<div>
  <label className="block text-sm font-medium">Phone *</label>
  <input
    name="customerPhone"
    className="mt-1 w-full border rounded p-2 dark:bg-gray-800"
    value={form.customerPhone}
    onChange={handleChange}
    placeholder="Primary phone (required)"
  />
</div>

{/* PHONE 2 */}
<div>
  <label className="block text-sm font-medium">Second Phone (optional)</label>
  <input
    name="customerPhone2"
    className="mt-1 w-full border rounded p-2 dark:bg-gray-800"
    value={form.customerPhone2 || ""}
    onChange={handleChange}
    placeholder="Optional secondary phone"
  />
</div>

              <div>
                <label className="block text-sm font-medium">
                  Full Address *
                </label>
                <GoogleAddressInput
  value={form.customerAddress}
  onChange={(v) =>
    setForm((prev) => ({ ...prev, customerAddress: v }))
  }
/>
                {/* TODO: later → Google autocomplete + map button */}
              </div>
            </div>
          </div>

          {/* Job details block */}
          <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 space-y-3">
            <h2 className="font-semibold text-lg mb-1">Job Details</h2>

            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium">
                  Job Title (optional)
                </label>
                <input
                  name="title"
                  className="mt-1 w-full border rounded p-2 dark:bg-gray-800"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="If empty, we'll auto-generate from name + job type"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Job Type</label>
                <select
                  name="jobTypeId"
                  className="mt-1 w-full border rounded p-2 dark:bg-gray-800"
                  value={form.jobTypeId}
                  onChange={handleChange}
                >
                  <option value="">Select job type</option>
                  {jobTypes.map((jt: any) => (
                    <option key={jt.id} value={jt.id}>
                      {jt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">Notes</label>
                <textarea
                  name="description"
                  className="mt-1 w-full border rounded p-2 dark:bg-gray-800 min-h-[80px]"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Internal notes about this job..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN – Tech + Schedule + SMS */}
        <div className="space-y-4">
          {/* Technician / assignment */}
          <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 space-y-3">
            <h2 className="font-semibold text-lg mb-1">Assignment</h2>

            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium">
                  Technician
                </label>
                <select
                  name="technicianId"
                  className="mt-1 w-full border rounded p-2 dark:bg-gray-800"
                  value={form.technicianId}
                  onChange={handleChange}
                >
                  <option value="">Unassigned</option>
                  {techs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.phone ? ` (${t.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  id="sendSmsToTech"
                  type="checkbox"
                  name="sendSmsToTech"
                  checked={form.sendSmsToTech}
                  onChange={handleChange}
                />
                <label
                  htmlFor="sendSmsToTech"
                  className="text-sm cursor-pointer"
                >
                  Send SMS to technician on create
                </label>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 space-y-3">
            <h2 className="font-semibold text-lg mb-1">Scheduling</h2>

            <p className="text-xs text-gray-500">
              You can leave this empty for immediate / ASAP jobs. Use when
              booking appointments.
            </p>

            <div>
              <label className="block text-sm font-medium">
                Appointment Time
              </label>
              <input
                type="datetime-local"
                name="scheduledAt"
                className="mt-1 w-full border rounded p-2 dark:bg-gray-800"
                value={form.scheduledAt || ""}
                onChange={handleChange}
                // placeholder={localISO}
              />
            </div>
          </div>

          {/* Lead Source */}
          <div className="border rounded-lg p-4 bg-white dark:bg-gray-900 space-y-2">
            <h2 className="font-semibold text-sm">Lead Source</h2>
            <select
              name="sourceId"
              className="mt-1 w-full border rounded p-2 dark:bg-gray-800"
              value={form.sourceId || ""}
              onChange={handleChange}
            >
              <option value="">Select source</option>
              {leadSources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 rounded bg-blue-600 text-white disabled:opacity-70"
            >
              {saving ? "Creating..." : "Create Job"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
