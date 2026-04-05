"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { UserRole } from "@prisma/client";
import type { AppUser } from "@/lib/types";

type SessionContextValue = {
  user: AppUser | null;
  setSessionUser: (user: AppUser | null, options?: { remember?: boolean }) => void;
  updateSessionUser: (user: Partial<AppUser>) => void;
  logout: () => void;
  isReady: boolean;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);
const STORAGE_KEY = "room-reservation-user";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) ?? window.sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setUser(JSON.parse(saved) as AppUser);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        window.sessionStorage.removeItem(STORAGE_KEY);
        setUser(null);
      }
    }
    setIsReady(true);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      setSessionUser: (nextUser, options) => {
        setUser(nextUser);
        if (nextUser) {
          const serialized = JSON.stringify(nextUser);
          if (options?.remember === false) {
            window.localStorage.removeItem(STORAGE_KEY);
            window.sessionStorage.setItem(STORAGE_KEY, serialized);
          } else {
            window.sessionStorage.removeItem(STORAGE_KEY);
            window.localStorage.setItem(STORAGE_KEY, serialized);
          }
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
          window.sessionStorage.removeItem(STORAGE_KEY);
        }
      },
      updateSessionUser: (nextUser) => {
        setUser((current) => {
          if (!current) {
            return current;
          }

          const merged = { ...current, ...nextUser };
          const serialized = JSON.stringify(merged);
          if (window.localStorage.getItem(STORAGE_KEY)) {
            window.localStorage.setItem(STORAGE_KEY, serialized);
          }
          if (window.sessionStorage.getItem(STORAGE_KEY)) {
            window.sessionStorage.setItem(STORAGE_KEY, serialized);
          }
          return merged;
        });
      },
      logout: () => {
        setUser(null);
        window.localStorage.removeItem(STORAGE_KEY);
        window.sessionStorage.removeItem(STORAGE_KEY);
      },
      isReady
    }),
    [isReady, user]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return context;
}

export function isAdminRole(role: UserRole | undefined | null) {
  return role === "ADMIN";
}
