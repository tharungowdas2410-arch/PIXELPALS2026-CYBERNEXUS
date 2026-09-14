"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, logout as clearSession } from "@/lib/api/auth";
import { getStoredToken } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import { LoadingState } from "@/components/QueryStates";
import type { User } from "@/lib/types/api";

const PUBLIC_PATHS = new Set(["/login", "/register"]);

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  ready: false,
  logout: () => undefined,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const isPublic = PUBLIC_PATHS.has(pathname);

  useEffect(() => {
    setToken(getStoredToken());
    setReady(true);
  }, [pathname]);

  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
    enabled: ready && Boolean(token) && !isPublic,
    retry: false,
  });

  useEffect(() => {
    if (!ready || isPublic) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    if (me.isError) {
      clearSession();
      setToken(null);
      router.replace("/login");
    }
  }, [ready, isPublic, token, me.isError, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: me.data ?? null,
      ready,
      logout: () => {
        clearSession();
        setToken(null);
        queryClient.clear();
        router.replace("/login");
      },
    }),
    [me.data, queryClient, ready, router],
  );

  if (!ready) {
    return <LoadingState label="Starting CYBERNEXUS…" />;
  }

  if (isPublic) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  if (!token || me.isLoading) {
    return <LoadingState label="Authenticating…" />;
  }

  if (me.isError || !me.data) {
    return <LoadingState label="Redirecting to login…" />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
