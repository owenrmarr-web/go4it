"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface ActiveOrg {
  name: string;
  slug: string;
  logo: string | null;
}

interface ActiveOrgContextValue {
  activeOrg: ActiveOrg | null;
  setActiveOrg: (org: ActiveOrg | null) => void;
}

const ActiveOrgContext = createContext<ActiveOrgContextValue>({
  activeOrg: null,
  setActiveOrg: () => {},
});

const STORAGE_KEY = "go4it-active-org";

export function useActiveOrg() {
  return useContext(ActiveOrgContext);
}

export function ActiveOrgProvider({ children }: { children: React.ReactNode }) {
  const [activeOrg, setActiveOrgState] = useState<ActiveOrg | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setActiveOrgState(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const setActiveOrg = useCallback((org: ActiveOrg | null) => {
    setActiveOrgState(org);
    try {
      if (org) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(org));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <ActiveOrgContext.Provider value={{ activeOrg, setActiveOrg }}>
      {children}
    </ActiveOrgContext.Provider>
  );
}
