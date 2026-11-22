"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ButtonLink from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import PageContainer from "@/components/layout/page-container";
import { dashboardHrefForRole } from "@/lib/booking-contract.js";
import { getCurrentApplicationUser } from "@/lib/protected-api.js";

export default function DashboardHome() {
  const router = useRouter();
  const [state, setState] = useState({ status: "loading", role: null });

  useEffect(() => {
    let active = true;

    getCurrentApplicationUser()
      .then((user) => {
        if (!active) return;
        const role = user?.role ?? null;
        setState({ status: "ready", role });
        if (role) router.replace(dashboardHrefForRole(role));
      })
      .catch(() => {
        if (active) setState({ status: "error", role: null });
      });

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main id="main-content" className="flex-1 py-12">
      <PageContainer>
        <div className="mx-auto max-w-xl text-center">
          {state.status === "loading" ? (
            <div aria-label="Opening dashboard" className="space-y-4">
              <Skeleton className="mx-auto h-10 w-64" />
              <Skeleton className="mx-auto h-5 w-full max-w-sm" />
            </div>
          ) : null}

          {state.status === "ready" && state.role ? (
            <p role="status" className="text-sm text-muted-foreground">
              Opening your dashboard…
            </p>
          ) : null}

          {state.status === "error" || (state.status === "ready" && !state.role) ? (
            <div role="alert" className="space-y-4">
              <h1 className="text-2xl font-semibold">Sign in to open your dashboard</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Your role is read from the authenticated application user before a
                dashboard is shown.
              </p>
              <ButtonLink href="/sign-in">Sign in</ButtonLink>
            </div>
          ) : null}
        </div>
      </PageContainer>
    </main>
  );
}
