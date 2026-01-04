"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Props {
  technician: any;
  base: string;
  onChange: (updates: any) => void;
}

export default function MaskedCallSettingsTab({
  technician,
  base,
  onChange,
}: Props) {
  const [maskedNumbers, setMaskedNumbers] = useState<any[]>([]);
  const [selectedSid, setSelectedSid] = useState<string | null>(
    technician?.maskedTwilioNumberSid || null
  );
  const [loading, setLoading] = useState(false);

  /* ============================================================
     KEEP STATE IN SYNC WHEN TECH CHANGES
  ============================================================ */
  useEffect(() => {
    setSelectedSid(technician?.maskedTwilioNumberSid || null);
  }, [technician?.maskedTwilioNumberSid]);

  /* ============================================================
     LOAD MASKED NUMBERS FROM BACKEND
  ============================================================ */
  useEffect(() => {
    setLoading(true);

    fetch(`${base}/system/twilio/masked-numbers`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load numbers");
        return r.json();
      })
      .then(setMaskedNumbers)
      .catch(() => {
        toast.error("Failed to load Twilio masked numbers");
      })
      .finally(() => setLoading(false));
  }, [base]);

  /* ============================================================
     SAVE SELECTED NUMBER
  ============================================================ */
  const saveMaskedNumber = async () => {
  try {
    const res = await fetch(`${base}/technicians/${technician.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        maskedTwilioNumberSid: selectedSid,
        maskedCalls: Boolean(selectedSid),
      }),
    });

    if (!res.ok) throw new Error();

    onChange({ maskedTwilioNumberSid: selectedSid });
    toast.success("Masked call number saved");
  } catch {
    toast.error("Failed to save masked number");
  }
};

  /* ============================================================
     GUARD: FEATURE DISABLED
  ============================================================ */
  if (!technician?.maskedCalls) {
    return (
      <div className="text-sm text-gray-500">
        Enable “Masked Calls” to assign a Twilio number.
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
      <h3 className="font-semibold text-lg">Masked Call Number</h3>

      {loading ? (
        <div className="text-sm text-gray-500">Loading numbers…</div>
      ) : maskedNumbers.length === 0 ? (
        <div className="text-sm text-gray-500">
          No Twilio numbers available for masked calls.
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">
              Select Twilio Number
            </label>

            <select
              className="w-full border p-2 rounded"
              value={selectedSid || ""}
              onChange={(e) => setSelectedSid(e.target.value || null)}
            >
              <option value="">— None —</option>

              {maskedNumbers.map((n) => (
                <option key={n.sid} value={n.sid}>
                  {n.phoneNumber} ({n.friendlyName || "Masked"})
                </option>
              ))}
            </select>

            <p className="text-xs text-gray-500 mt-1">
              This number will be used for masked calls & call recordings.
            </p>
          </div>

          <button
            onClick={saveMaskedNumber}
            disabled={!selectedSid}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Save Masked Number
          </button>
        </>
      )}
    </div>
  );
}