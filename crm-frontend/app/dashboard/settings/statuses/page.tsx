"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";

interface Status {
  id: string;
  name: string;
  color: string;
  active: boolean;
  locked: boolean;
  order: number;
}

export default function StatusSettingsPage() {
  const base = process.env.NEXT_PUBLIC_API_URL!;
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    try {
      const res = await fetch(`${base}/job-status`, {
        credentials: "include",
      });
      const data = await res.json();
      setStatuses(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load statuses");
    }
    setLoading(false);
  };

  /* -------------------------------
      CREATE NEW STATUS
  -------------------------------- */
  const createStatus = async () => {
    if (!newStatusName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch(`${base}/job-status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStatusName.trim(),
          active: true,
          color: "#6b7280",
          order: statuses.length + 1,
        }),
      });

      if (!res.ok) throw new Error("Create failed");

      toast.success("Status created");
      setNewStatusName("");
      loadStatuses();
    } catch (err) {
      toast.error("Could not create status");
    }

    setCreating(false);
  };

  /* -------------------------------
      INLINE UPDATE (NAME, COLOR, ACTIVE)
  -------------------------------- */
  const updateStatus = async (id: string, updates: Partial<Status>) => {
    try {
      const res = await fetch(`${base}/job-status/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Update failed");

      setStatuses((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  /* -------------------------------
      LOCK / UNLOCK
  -------------------------------- */
  const toggleLock = async (id: string, locked: boolean) => {
    try {
      const res = await fetch(
        `${base}/job-status/${id}/${locked ? "unlock" : "lock"}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!res.ok) throw new Error();

      toast.success(locked ? "Unlocked" : "Locked");

      setStatuses((prev) =>
        prev.map((s) => (s.id === id ? { ...s, locked: !locked } : s))
      );
    } catch (err) {
      toast.error("Failed to update lock");
    }
  };

  /* -------------------------------
      DELETE STATUS
  -------------------------------- */
  const deleteStatus = async (id: string) => {
    try {
      const res = await fetch(`${base}/job-status/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error();

      toast.success("Deleted");
      setStatuses((prev) => prev.filter((s) => s.id !== id));
    } catch {
      toast.error("Failed to delete");
    }
  };

  /* -------------------------------
      DRAG & DROP SORT
  -------------------------------- */
  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(statuses);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);

    const reordered = items.map((s, index) => ({
      ...s,
      order: index,
    }));

    setStatuses(reordered);

    await fetch(`${base}/job-status/reorder`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order: reordered.map((s) => ({ id: s.id, order: s.order })),
      }),
    });
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Job Status Settings</h1>
      <p className="text-gray-500 text-sm">
        Reorder, rename, color-tag, lock and manage job statuses.
      </p>

      {/* CREATE NEW */}
      <div className="flex gap-3 items-center">
        <input
          className="border px-3 py-2 rounded w-full dark:bg-gray-900"
          placeholder="New status name"
          value={newStatusName}
          onChange={(e) => setNewStatusName(e.target.value)}
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          disabled={creating}
          onClick={createStatus}
        >
          Add
        </button>
      </div>

      {/* STATUS LIST */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="statuses">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {statuses.map((status, index) => (
                <Draggable
                  key={status.id}
                  draggableId={status.id}
                  index={index}
                >
                  {(provided) => (
                    <div
                      className="border rounded p-3 bg-white dark:bg-gray-900 flex items-center justify-between"
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                    >
                      {/* DRAG HANDLE */}
                      <div {...provided.dragHandleProps} className="cursor-grab px-2">⋮⋮</div>

                      {/* NAME + COLOR + ACTIVE */}
                      <div className="flex-1 flex items-center gap-4">
                        {/* INLINE NAME EDIT */}
                        <input
                          className="border px-2 py-1 rounded w-40 dark:bg-gray-800"
                          value={status.name}
                          onChange={(e) =>
                            updateStatus(status.id, { name: e.target.value })
                          }
                          disabled={status.locked}
                        />

                        {/* COLOR PICKER */}
                        <input
                          type="color"
                          value={status.color}
                          onChange={(e) =>
                            updateStatus(status.id, { color: e.target.value })
                          }
                        />

                        {/* ACTIVE TOGGLE */}
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={status.active}
                            onChange={() =>
                              updateStatus(status.id, {
                                active: !status.active,
                              })
                            }
                          />
                          Active
                        </label>
                      </div>

                      {/* LOCK */}
                      <button
                        onClick={() => toggleLock(status.id, status.locked)}
                        className="px-3 py-1 rounded text-sm"
                      >
                        {status.locked ? "Unlock" : "Lock"}
                      </button>

                      {/* DELETE */}
                      {!status.locked && (
                        <button
                          onClick={() => deleteStatus(status.id)}
                          className="px-3 py-1 text-red-600 text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}

              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}