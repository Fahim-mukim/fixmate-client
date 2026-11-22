"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import PageContainer from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { clearAccessToken } from "@/lib/auth-token.js";
import {
  BOOKING_ROLE_LABELS,
  dashboardLinksForRole,
} from "@/lib/dashboard-navigation.js";
import { cn } from "cn";

function isActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardShell({ role, title, description, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const links = dashboardLinksForRole(role);

  async function handleSignOut() {
    setSignOutError("");
    setSigningOut(true);
    try {
      await authClient.signOut();
      clearAccessToken();
      router.push("/sign-in");
      router.refresh();
    } catch {
      setSignOutError("Sign out did not complete. Try again.");
      setSigningOut(false);
    }
  }

  return (
    <main id="main-content" className="flex-1 py-10 sm:py-12">
      <PageContainer>
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-teal-strong uppercase dark:text-teal">
            {BOOKING_ROLE_LABELS[role] ?? "Dashboard"}
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>
          {description ? (
            <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside aria-label="Dashboard navigation" className="lg:sticky lg:top-24 lg:h-fit">
            <nav className="flex gap-2 overflow-x-auto rounded-xl border border-border bg-surface p-2 lg:flex-col lg:overflow-visible">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-mist hover:text-foreground dark:hover:bg-surface-alt",
                    isActive(pathname, link.href) &&
                      "bg-mist text-foreground dark:bg-surface-alt",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={handleSignOut}
              disabled={signingOut}
              aria-busy={signingOut}
            >
              <LogOut aria-hidden="true" className="size-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
            {signOutError ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {signOutError}
              </p>
            ) : null}
          </aside>

          <div className="min-w-0 space-y-8">{children}</div>
        </div>
      </PageContainer>
    </main>
  );
}
