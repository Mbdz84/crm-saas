"use client";

import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function GoogleAddressInput({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!window.google || !ref.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(ref.current!, {
      fields: ["formatted_address", "geometry", "address_components"],
      types: ["address"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();

      if (place?.formatted_address) {
        let formatted = place.formatted_address;

        // 🔥 Remove trailing ", USA"
        formatted = formatted.replace(/,?\s*USA$/i, "");

        onChange(formatted);
      }
    });
  }, []);

  return (
    <input
      ref={ref}
      type="text"
      className="mt-1 w-full border rounded p-2 dark:bg-gray-800"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Start typing address..."}
    />
  );
}