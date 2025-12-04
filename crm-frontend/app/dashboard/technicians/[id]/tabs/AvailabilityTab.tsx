"use client";

interface Props {
  tech: any;
  reload: () => Promise<void>;
  setTech: (value: any) => void;
  save: () => Promise<void>;
  saving: boolean;
}

export default function AvailabilityTab({
  tech,
  reload,
  setTech,
  save,
  saving,
}: Props) {
  const schedule = tech.availability || {
    mon: { enabled: false, from: "", to: "" },
    tue: { enabled: false, from: "", to: "" },
    wed: { enabled: false, from: "", to: "" },
    thu: { enabled: false, from: "", to: "" },
    fri: { enabled: false, from: "", to: "" },
    sat: { enabled: false, from: "", to: "" },
    sun: { enabled: false, from: "", to: "" },
  };

  const update = (day: string, field: string, value: any) => {
    const updated = {
      ...schedule,
      [day]: { ...schedule[day], [field]: value },
    };
    setTech({ ...tech, availability: updated });
  };

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Availability</h2>

      {Object.keys(schedule).map((day) => (
        <div key={day} className="flex items-center gap-4">
          <input
            type="checkbox"
            checked={schedule[day].enabled}
            onChange={(e) => update(day, "enabled", e.target.checked)}
          />

          <span className="capitalize w-16">{day}</span>

          <input
            type="time"
            className="border p-1"
            value={schedule[day].from}
            onChange={(e) => update(day, "from", e.target.value)}
          />

          <input
            type="time"
            className="border p-1"
            value={schedule[day].to}
            onChange={(e) => update(day, "to", e.target.value)}
          />
        </div>
      ))}

      <button
        disabled={saving}
        onClick={save}
        className="px-4 py-2 bg-blue-600 text-white rounded w-full mt-4"
      >
        {saving ? "Saving..." : "Save Availability"}
      </button>
    </div>
  );
}