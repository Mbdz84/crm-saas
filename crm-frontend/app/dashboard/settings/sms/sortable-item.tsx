"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

export default function SortableItem({
  id,
  label,
  enabled,
  showLabel,
  onToggle,
  onToggleLabel,
  onRename,
}: {
  id: string;
  label: string;
  enabled: boolean;
  showLabel: boolean;
  onToggle: () => void;
  onToggleLabel: () => void;
  onRename: (newLabel: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 border rounded bg-white dark:bg-gray-800 shadow-sm"
    >
      {/* LEFT SIDE - Drag + Label Rename */}
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-500 hover:text-black dark:hover:text-white"
        >
          <GripVertical size={18} />
        </button>

        {/* Editable label */}
        <input
          className="border rounded px-2 py-1 text-sm w-32 dark:bg-gray-700 dark:text-white"
          value={label}
          onChange={(e) => onRename(e.target.value)}
        />
      </div>

      {/* RIGHT SIDE - Toggles */}
      <div className="flex items-center gap-6 text-sm">
        {/* Label toggle */}
        <label className="flex items-center gap-1 text-xs">
          Label
          <input
            type="checkbox"
            checked={!!showLabel}
            onChange={onToggleLabel}
          />
        </label>

        {/* Enabled toggle */}
        <label className="flex items-center gap-1 text-xs">
          Show
          <input
            type="checkbox"
            checked={!!enabled}
            onChange={onToggle}
          />
        </label>
      </div>
    </div>
  );
}