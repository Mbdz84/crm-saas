"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AddJobFromTextPage() {
  const router = useRouter();

  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  // ⭐ LEAD SOURCES
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [leadSourceId, setLeadSourceId] = useState("");

  // ⭐ TECHNICIANS
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [techLoading, setTechLoading] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL;

  /* ============================================================
     LOAD LEAD SOURCES
  ============================================================ */
  useEffect(() => {
    const loadLeadSources = async () => {
      try {
        const res = await fetch(`${API}/lead-sources`, {
          credentials: "include",
        });
        const data = await res.json();

        const list = Array.isArray(data)
          ? data
          : data.sources || data.leadSources || [];

        setLeadSources(list);
      } catch (err) {
        console.error("LOAD LEAD SOURCES ERROR:", err);
      }
    };

    loadLeadSources();
  }, [API]);

  /* ============================================================
     LOAD TECHNICIANS
  ============================================================ */
  useEffect(() => {
    const loadTechs = async () => {
      try {
        setTechLoading(true);
        const res = await fetch(`${API}/technicians`, {
          credentials: "include",
        });

        const data = await res.json();
        if (!res.ok) {
          toast.error("Failed to load technicians");
          return;
        }

        const list = Array.isArray(data) ? data : data.techs || [];
        setTechnicians(list);
      } catch (err) {
        toast.error("Failed to load technicians");
      } finally {
        setTechLoading(false);
      }
    };

    loadTechs();
  }, [API]);

  /* ============================================================
     PARSE RAW TEXT
  ============================================================ */
  const handleExtract = async () => {
    if (!rawText.trim()) {
      toast.error("Please paste the SMS text first");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API}/jobs/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: rawText }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Extraction failed");
        return;
      }

      setPreview(data);

      // ⭐ auto-select extracted lead source if exists
      if (data.source && leadSources.length > 0) {
        const match = leadSources.find(
          (s) => s.name.toLowerCase() === data.source.toLowerCase()
        );
        if (match) setLeadSourceId(match.id);
      }

      toast.success("Fields extracted");
    } catch (err) {
      toast.error("Error extracting");
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     CREATE JOB
  ============================================================ */
  const handleCreateJob = async () => {
    if (!preview) return;

    try {
      setLoading(true);

      const res = await fetch(`${API}/jobs/create-from-parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
  ...preview,
  customerPhone2: preview.customerPhone2 || null,
  technicianId: selectedTechId || null,
  leadSourceId: leadSourceId || null,
  __rawText: rawText,
}),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Job creation failed");
        return;
      }

      toast.success("Job created!");
      router.push(`/dashboard/jobs/${data.shortId}`);
    } catch (err) {
      toast.error("Error creating job");
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Add Job From Text Message</h1>

      {/* TEXT INPUT */}
      <textarea
        rows={15}
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        className="w-full p-3 border rounded bg-white text-black"
        placeholder="Paste SMS / WhatsApp / Email text here..."
      />

      <button
        onClick={handleExtract}
        disabled={loading || !rawText}
        className="mt-4 px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
      >
        {loading ? "Extracting..." : "Extract Fields"}
      </button>

      {/* PREVIEW */}
      {preview && (
        <div className="mt-6 p-4 border rounded bg-gray-50 space-y-4">
          <h2 className="text-xl font-semibold">Extracted Details</h2>

          <div className="space-y-1 text-sm">
  <p><strong>Lead Source:</strong> {preview.source}</p>
  <p><strong>Name:</strong> {preview.customerName}</p>

  <p><strong>Phone:</strong> {preview.customerPhone}</p>

  {preview.customerPhone2 && (
    <p><strong>Phone 2:</strong> {preview.customerPhone2}</p>
  )}

  <p><strong>Address:</strong> {preview.customerAddress}</p>
  <p><strong>Job Type:</strong> {preview.jobType}</p>
  <p><strong>Description:</strong> {preview.description}</p>
</div>

          {/* ⭐ LEAD SOURCE SELECT */}
          <div>
            <label className="block text-sm font-medium mb-1">Lead Source</label>
            <select
              className="border rounded p-2 w-full bg-white"
              value={leadSourceId}
              onChange={(e) => setLeadSourceId(e.target.value)}
            >
              <option value="">Select lead source...</option>
              {leadSources.map((src) => (
                <option key={src.id} value={src.id}>
                  {src.name}
                </option>
              ))}
            </select>
          </div>

          {/* ⭐ TECHNICIAN SELECT */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Assign Technician (optional)
            </label>
            <select
              className="border rounded p-2 w-full bg-white"
              value={selectedTechId}
              disabled={techLoading}
              onChange={(e) => setSelectedTechId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.phone ? `(${t.phone})` : ""}
                </option>
              ))}
            </select>
            {techLoading && (
              <p className="text-xs text-gray-500">Loading technicians…</p>
            )}
          </div>

          {/* CREATE JOB BUTTON */}
          <button
            onClick={handleCreateJob}
            disabled={loading}
            className="mt-4 px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create Job"}
          </button>
        </div>
      )}
    </div>
  );
}