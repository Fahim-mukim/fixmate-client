"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

import PageContainer from "@/components/layout/page-container";
import ButtonLink from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentApplicationUser } from "@/lib/protected-api.js";
import { dashboardHrefForRole } from "@/lib/booking-contract.js";
import { BOOKING_ROLE_LABELS } from "@/lib/dashboard-navigation.js";
import { signInUrlForNext } from "@/lib/return-url.js";
import { setSessionIdentity } from "@/lib/session-identity-store.js";
import DashboardShell from "./dashboard-shell.jsx";

const DashboardUserContext = createContext(null);
const DashboardUserRefreshContext = createContext(null);

export function useDashboardUser() {
  const user = useContext(DashboardUserContext);
  if (!user) throw new Error("useDashboardUser must be used inside DashboardGate.");
  return user;
}

export function useDashboardUserRefresh() {
  const refreshUser = useContext(DashboardUserRefreshContext);
  if (!refreshUser) {
    throw new Error("useDashboardUserRefresh must be used inside DashboardGate.");
  }
  return refreshUser;
}

function isSessionError(message) {
  return /auth|session|sign in|unauthor|token|credential/i.test(message || "");
}

function GateFallback({ title, description, children }) {
  return (
    <main id="main-content" className="flex-1 py-10 sm:py-12">
      <PageContainer>{children}</PageContainer>
    </main>
  );
}

export default function DashboardGate({
  expectedRole,
  allowAnyRole = false,
  title,
  description,
  children,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    status: "loading",
    user: null,
    message: "",
  });

  async function refreshUser() {
    const user = await getCurrentApplicationUser();
    setSessionIdentity(user);
    setState({ status: "ready", user, message: "" });
    return user;
  }

  useEffect(() => {
    let active = true;

    getCurrentApplicationUser()
      .then((user) => {
        if (!active) return;
        setSessionIdentity(user);
        setState({ status: "ready", user, message: "" });
      })
      .catch((error) => {
        if (active) {
          setState({
            status: "error",
            user: null,
            message: error?.message || "Unable to load the current user.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const sessionExpired = state.status === "error" && isSessionError(state.message);
  const signInHref = signInUrlForNext(pathname);

  // A protected page opened without a valid session lands on sign-in with a
  // safe return path. The manual link below remains as a fallback.
  useEffect(() => {
    if (!sessionExpired) return;
    const search = typeof window === "undefined" ? "" : window.location.search;
    router.replace(signInUrlForNext(pathname, search));
  }, [sessionExpired, pathname, router]);

  if (state.status === "loading") {
    return (
      <GateFallback>
        <div aria-label="Loading dashboard" className="space-y-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="h-5 w-full max-w-2xl" />
          <div className="grid gap-5 sm:grid-cols-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </GateFallback>
    );
  }

  if (state.status === "error") {
    const expired = sessionExpired;
    return (
      <GateFallback>
        <div
          role="alert"
          className="mx-auto max-w-xl rounded-2xl border border-danger/35 bg-danger/5 px-6 py-12 text-center"
        >
          <h1 className="text-2xl font-semibold">
            {expired ? "Sign in to continue" : "We couldn’t load your dashboard"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {expired
              ? "Your session is required before booking data can be shown."
              : state.message}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {expired ? (
              <ButtonLink href={signInHref}>Sign in</ButtonLink>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  setState({ status: "loading", user: null, message: "" });
                  setAttempt((value) => value + 1);
                }}
              >
                Try again
              </Button>
            )}
            <ButtonLink href="/services" variant="outline">
              Browse services
            </ButtonLink>
          </div>
        </div>
      </GateFallback>
    );
  }

  if (!allowAnyRole && state.user?.role !== expectedRole) {
    return (
      <GateFallback>
        <div
          role="alert"
          className="mx-auto max-w-xl rounded-2xl border border-warning/35 bg-warning/8 px-6 py-12 text-center"
        >
          <h1 className="text-2xl font-semibold">This dashboard isn’t for your role</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            You are signed in as a {BOOKING_ROLE_LABELS[state.user?.role]?.replace(" dashboard", "") || "different role"}. Open your own dashboard instead.
          </p>
          <ButtonLink href={dashboardHrefForRole(state.user?.role)} className="mt-6">
            Go to my dashboard
          </ButtonLink>
        </div>
      </GateFallback>
    );
  }

  return (
    <DashboardUserContext.Provider value={state.user}>
      <DashboardUserRefreshContext.Provider value={refreshUser}>
        <DashboardShell
          role={allowAnyRole ? state.user.role : expectedRole}
          user={state.user}
          title={title}
          description={description}
        >
          {children}
        </DashboardShell>
      </DashboardUserRefreshContext.Provider>
    </DashboardUserContext.Provider>
  );
}
