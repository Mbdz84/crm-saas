"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AddJobFromTextPage() {
  const router = useRouter();

  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const handleExtract = async () => {
    if (!rawText.trim()) {
      toast.error("Please paste the SMS text first");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
        credentials: "include",   // 🔥 SEND COOKIES FOR AUTH
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error("Extraction failed");
        console.error(data);
        return;
      }

      setPreview(data);
      toast.success("Fields extracted");
    } catch (err) {
      console.error(err);
      toast.error("Error extracting text");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async () => {
    if (!preview) return;

    try {
      setLoading(true);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs/create-from-parse`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    ...preview,
    __rawText: rawText,   // 🔥 added INSIDE the body, correct location
  }),
});

      const data = await res.json();

      if (!res.ok) {
        toast.error("Job creation failed");
        return;
      }

      toast.success("Job created!");
      router.push(`/dashboard/jobs/${data.shortId}`);
    } catch (err) {
      console.error(err);
      toast.error("Error creating job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Add Job From Text Message</h1>

      {/* TEXT AREA */}
      <textarea
        rows={15}
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        className="w-full p-3 border rounded bg-white text-black"
        placeholder="Paste the SMS / WhatsApp / Email text here..."
      />

      <button
        onClick={handleExtract}
        disabled={loading || !rawText}
        className="mt-4 px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
      >
        {loading ? "Extracting..." : "Extract Fields"}
      </button>

      {/* PREVIEW SECTION */}
      {preview && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Extracted Details</h2>

          <div className="space-y-1 text-sm">
            <p><strong>Lead Source:</strong> {preview.source}</p>
            <p><strong>Name:</strong> {preview.customerName}</p>
            <p><strong>Phone:</strong> {preview.customerPhone}</p>
            <p><strong>Address:</strong> {preview.customerAddress}</p>
            <p><strong>Job Type:</strong> {preview.jobType}</p>
            <p><strong>Description:</strong> {preview.description}</p>
          </div>

          <button
            onClick={handleCreateJob}
            className="mt-4 px-4 py-2 rounded bg-green-600 text-white"
          >
            Create Job
          </button>
        </div>
      )}
    </div>
  );
}