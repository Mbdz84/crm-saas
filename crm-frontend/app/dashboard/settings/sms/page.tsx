"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import SortableItem from "./sortable-item";

type SmsFieldKey =
  | "id"
  | "name"
  | "phone"
  | "address"
  | "jobType"
  | "notes"
  | "appointment"
  | "leadSource";

interface SmsField {
  key: SmsFieldKey;
  label: string;
  enabled: boolean;
  showLabel: boolean;
}

export default function SmsSettingsPage() {
  const base = process.env.NEXT_PUBLIC_API_URL;

  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<SmsField[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  /* ---------------------------------------------------------
      LOAD SETTINGS
  --------------------------------------------------------- */
  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch(`${base}/sms-settings`, {
        credentials: "include",
      });

      if (!res.ok) {
  toast.error("Failed to load SMS settings");
  return;
}

let s;
try {
  s = await res.json();
} catch (e) {
  toast.error("Invalid server response");
  return;
}

      const list: SmsField[] = s.order.map((key: SmsFieldKey) => ({
        key,
        label: s.label[key],
        enabled: s.show[key],
        showLabel: s.showLabel[key],
      }));

      setFields(list);
    } catch (err) {
      toast.error("Failed to load SMS settings");
    }
    setLoading(false);
  }

  /* ---------------------------------------------------------
      SAVE TO BACKEND
  --------------------------------------------------------- */
  async function save(list: SmsField[]) {
    const body: any = {
      order: list.map((f) => f.key),
    };

    for (const f of list) {
      body[f.key] = f.enabled;
      body[`label_${f.key}`] = f.showLabel;
      body[`labelText_${f.key}`] = f.label;
    }

    try {
      await fetch(`${base}/sms-settings`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      toast.success("SMS settings saved");
    } catch (err) {
      toast.error("Failed to save");
    }
  }

  /* ---------------------------------------------------------
      DRAG END
  --------------------------------------------------------- */
  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.key === active.id);
    const newIndex = fields.findIndex((f) => f.key === over.id);

    const reordered = [...fields];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    setFields(reordered);
    save(reordered);
  }

  /* ---------------------------------------------------------
      TOGGLES
  --------------------------------------------------------- */
  function toggleField(key: SmsFieldKey) {
    const updated = fields.map((f) =>
      f.key === key ? { ...f, enabled: !f.enabled } : f
    );
    setFields(updated);
    save(updated);
  }

  function toggleLabel(key: SmsFieldKey) {
    const updated = fields.map((f) =>
      f.key === key ? { ...f, showLabel: !f.showLabel } : f
    );
    setFields(updated);
    save(updated);
  }

  function renameField(key: SmsFieldKey, label: string) {
    const updated = fields.map((f) =>
      f.key === key ? { ...f, label } : f
    );
    setFields(updated);
    save(updated);
  }

  /* ---------------------------------------------------------
      PREVIEW BUILDER
  --------------------------------------------------------- */
  const preview = fields
    .filter((f) => f.enabled)
    .map((f) =>
      f.showLabel ? `${f.label}: Sample` : "SAMPLE"
    )
    .join("\n");

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT */}
      <div>
        <h1 className="text-2xl font-semibold mb-3">SMS Settings</h1>
        <p className="text-gray-500 text-sm mb-4">
          Drag to reorder • Toggle fields • Rename labels
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.key)}
            strategy={verticalListSortingStrategy}
          >
            {fields.map((f) => (
              <SortableItem
                key={f.key}
                id={f.key}
                label={f.label}
                enabled={f.enabled}
                showLabel={f.showLabel}
                onToggle={() => toggleField(f.key)}
                onToggleLabel={() => toggleLabel(f.key)}
                onRename={(txt) => renameField(f.key, txt)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* RIGHT */}
      <div>
        <h2 className="text-lg font-semibold mb-3">SMS Preview</h2>
        <div className="border p-4 rounded bg-white whitespace-pre-wrap text-sm shadow">
          {preview || <span className="text-gray-500">No fields selected</span>}
        </div>
      </div>
    </div>
  );
}