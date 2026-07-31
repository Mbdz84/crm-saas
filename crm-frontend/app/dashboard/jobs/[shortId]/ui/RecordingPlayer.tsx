"use client";

import { useRef, useState } from "react";

/* ------------------------------------------------------------
   Audio player with always-visible speed buttons.
   playbackRate is set on the <audio> element so it works on any
   source (incl. Twilio recording URLs) and can be changed live.
   If the media 404s (e.g. a recording was deleted), shows a note.
------------------------------------------------------------ */
export default function RecordingPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [rate, setRate] = useState(1);
  const [failed, setFailed] = useState(false);
  const SPEEDS = [1, 1.25, 1.5, 2, 3];

  function setSpeed(r: number) {
    setRate(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  }

  if (failed) {
    return (
      <p className="text-xs text-gray-500 mt-1">Recording no longer available.</p>
    );
  }

  return (
    <>
      <audio
        ref={audioRef}
        controls
        src={url}
        className="mt-1 w-full rounded"
        onError={() => setFailed(true)}
        onLoadedMetadata={() => {
          if (audioRef.current) audioRef.current.playbackRate = rate;
        }}
      />
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 mt-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="text-blue-600 underline text-xs whitespace-nowrap self-start sm:self-auto"
        >
          Download MP3
        </a>
        <div className="flex flex-wrap justify-center gap-1 self-center sm:self-auto">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={`px-2 py-0.5 text-xs rounded border ${
                rate === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
