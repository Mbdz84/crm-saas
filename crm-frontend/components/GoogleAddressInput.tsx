"use client";

import { useEffect, useRef } from "react";

export interface AddressParts {
  full: string; // "1301 E Euclid Ave, Arlington Heights, IL 60004"
  line1: string; // "1301 E Euclid Ave"
  cityStateZip: string; // "Arlington Heights, IL 60004"
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /**
   * Optional. When provided, a Google place selection fires this with the
   * parsed parts INSTEAD of onChange(full). Manual typing still uses onChange.
   */
  onSelect?: (parts: AddressParts) => void;
}

function parsePlace(place: any): AddressParts {
  const comps: any[] = place?.address_components || [];
  const get = (type: string, short = false) => {
    const c = comps.find((x) => x.types?.includes(type));
    return c ? (short ? c.short_name : c.long_name) : "";
  };

  const line1 = `${get("street_number")} ${get("route")}`.trim();
  const city =
    get("locality") ||
    get("postal_town") ||
    get("sublocality") ||
    get("administrative_area_level_2");
  const state = get("administrative_area_level_1", true);
  const zip = get("postal_code");

  const cityStateZip = [city, [state, zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  let full = place?.formatted_address || "";
  full = full.replace(/,?\s*USA$/i, "");

  return { full, line1: line1 || full, cityStateZip };
}

export default function GoogleAddressInput({
  value,
  onChange,
  placeholder,
  className,
  onSelect,
}: Props) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!window.google || !ref.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(ref.current!, {
      fields: ["formatted_address", "geometry", "address_components"],
      types: ["address"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place?.formatted_address) return;

      const parts = parsePlace(place);
      if (onSelect) {
        onSelect(parts);
      } else {
        onChange(parts.full);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <input
      ref={ref}
      type="text"
      className={className || "mt-1 w-full border rounded p-2 dark:bg-gray-800"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Start typing address..."}
    />
  );
}
