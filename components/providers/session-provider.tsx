"use client";

import { createContext, useContext, useMemo, useState } from "react";
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

export function SessionProvider({
  children,
  initialUser
}: {
  children: React.ReactNode;
  initialUser: AppUser | null;
}) {
  const [user, setUser] = useState<AppUser | null>(initialUser);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      setSessionUser: (nextUser) => {
        setUser(nextUser);
      },
      updateSessionUser: (nextUser) => {
        setUser((current) => {
          if (!current) {
            return current;
          }

          return { ...current, ...nextUser };
        });
      },
      logout: () => {
        setUser(null);
      },
      isReady: true
    }),
    [user]
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
