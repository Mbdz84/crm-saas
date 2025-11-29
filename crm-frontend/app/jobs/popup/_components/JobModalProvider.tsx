"use client";

import { JobProvider } from "../[shortId]/state/JobProvider";

// ⚠️ Fake params provider used only for modal popups
import { createContext, useContext } from "react";

const ModalParamsContext = createContext<{ shortId: string } | null>(null);

export function useModalParams() {
  return useContext(ModalParamsContext);
}

export default function JobModalProvider({
  shortId,
  children,
}: {
  shortId: string;
  children: React.ReactNode;
}) {
  return (
    <ModalParamsContext.Provider value={{ shortId }}>
      <JobProvider>{children}</JobProvider>
    </ModalParamsContext.Provider>
  );
}