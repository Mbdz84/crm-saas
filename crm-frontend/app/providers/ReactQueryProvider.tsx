"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Client-side data cache for the dashboard.
 *
 * Mounted in the dashboard layout, so the cache persists across navigation
 * between pages (e.g. jobs list <-> a job). Revisiting a page renders instantly
 * from cache while React Query revalidates in the background, instead of
 * re-fetching everything from scratch on every navigation.
 */
export default function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Fresh for 30s; a revisit within that window uses cache, no network.
            staleTime: 30_000,
            // Keep unused data 5 min so back-navigation stays instant.
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
