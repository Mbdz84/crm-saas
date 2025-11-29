"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export default function CalendarPage() {
  const [events, setEvents] = useState([]);

  // Load calendar jobs
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/jobs/calendar`,
          { credentials: "include" }
        );
        const data = await res.json();

        setEvents(
          data.map((job: any) => ({
            id: job.id,
            title: job.title,
            start: job.scheduledAt,
            extendedProps: {
              customer: job.customer,
            },
          }))
        );
      } catch (err) {
        console.error("Calendar load failed", err);
      }
    };

    load();
  }, []);

  // ◼️ Called when job is dragged
  const handleEventDrop = async (info: any) => {
    const newDate = info.event.start;

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/jobs/${info.event.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledAt: newDate,
          }),
        }
      );

      console.log("Job rescheduled");
    } catch (err) {
      console.error("Failed to update job");
      info.revert();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Calendar</h1>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        editable={true}
        droppable={true}
        eventDurationEditable={true}
        eventDrop={handleEventDrop}
        events={events}
        height="80vh"
      />
    </div>
  );
}