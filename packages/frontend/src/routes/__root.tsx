import { createRootRouteWithContext, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/app.store";
import { useAuthStore } from "@/stores/auth.store";
import { authApi } from "@/services/auth.api";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface RouterContext {
  queryClient: QueryClient;
}

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  const { t } = useTranslation();
  const theme = useAppStore((s) => s.theme);
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const setUser = useAuthStore((s) => s.setUser);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const checkingSession = hydrated && !!token && verifiedToken !== token;

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      return undefined;
    }

    if (theme === "light") {
      root.classList.remove("dark");
      return undefined;
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    root.classList.toggle("dark", mq.matches);
    const handler = (e: MediaQueryListEvent) => root.classList.toggle("dark", e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  useEffect(() => {
    if (!checkingSession || !token) {
      return undefined;
    }

    let cancelled = false;

    void authApi.me()
      .then((user) => {
        if (cancelled) return;
        setUser(user);
        setVerifiedToken(token);
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
        setVerifiedToken(null);
      });

    return () => {
      cancelled = true;
    };
  }, [checkingSession, token, setUser, clearSession]);

  useEffect(() => {
    if (!hydrated || checkingSession) return;

    if (!token && pathname !== "/auth") {
      void navigate({ to: "/auth", replace: true });
      return;
    }

    if (token && pathname === "/auth") {
      void navigate({ to: "/", replace: true });
    }
  }, [hydrated, checkingSession, token, pathname, navigate]);

  if (!hydrated || checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="rounded-2xl border bg-card px-6 py-5 text-sm text-muted-foreground shadow-sm">
          {t("common.loadingSession")}
        </div>
      </div>
    );
  }

  if ((!token && pathname !== "/auth") || (token && pathname === "/auth")) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
}
