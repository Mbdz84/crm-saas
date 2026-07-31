"use client";

export default function Editable({
  label,
  value,
  onChange,
  textarea = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  disabled?: boolean;
}) {
  const cls = `mt-1 w-full border rounded p-2 ${
    disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
  }`;
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      {textarea ? (
        <textarea
          className={`${cls} min-h-20`}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={cls}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}