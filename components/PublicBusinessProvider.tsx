"use client";

import { createContext, type ReactNode, useContext } from "react";
import { defaultPublicBusinessSettings, type PublicBusinessSettings } from "@/lib/business-settings";

const PublicBusinessContext = createContext<PublicBusinessSettings>(defaultPublicBusinessSettings);

export function PublicBusinessProvider({ business, children }: { business: PublicBusinessSettings; children: ReactNode }) {
  return <PublicBusinessContext.Provider value={business}>{children}</PublicBusinessContext.Provider>;
}

export function usePublicBusiness() {
  return useContext(PublicBusinessContext);
}
