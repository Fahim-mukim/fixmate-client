"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import PageContainer from "@/components/layout/page-container";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  BOOKING_ROLE_LABELS,
  dashboardLinksForRole,
} from "@/lib/dashboard-navigation.js";
import { safeProfileImageUrl } from "@/lib/profile-contract.js";
import { signOutCurrentSession } from "@/lib/sign-out.js";
import { useSessionIdentity } from "@/lib/session-identity.js";
import { cn } from "cn";

function isActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initialsFor(name) {
  const parts = (typeof name === "string" ? name : "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FM";
  return `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ""}`.toUpperCase();
}

function roleLabel(role) {
  return BOOKING_ROLE_LABELS[role]?.replace(" dashboard", "") ?? "";
}

export default function DashboardShell({ role, user, title, description, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const identity = useSessionIdentity();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const links = dashboardLinksForRole(role);

  // The shared store receives profile-save updates; the gate user is the
  // initial authoritative fallback before that store is populated.
  const displayName = identity?.name || user?.name || "";
  const displayEmail = identity?.email || user?.email || "";
  const displayImage = identity?.image ?? safeProfileImageUrl(user?.image);
  const displayRole = identity?.role || user?.role || role;

  async function handleSignOut() {
    setSignOutError("");
    setSigningOut(true);
    try {
      await signOutCurrentSession();
      toast.add({
        title: "Signed out",
        description: "You have been signed out of your FixMate account.",
        type: "success",
      });
      router.push("/");
      router.refresh();
    } catch {
      setSignOutError("Sign out did not complete. Try again.");
      toast.add({
        title: "Sign out failed",
        description: "Sign out did not complete. Please try again.",
        type: "error",
      });
      setSigningOut(false);
    }
  }

  return (
    <main id="main-content" className="flex-1 py-10 sm:py-12">
      <PageContainer>
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
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

          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
            <Avatar size="sm" className="size-9">
              {displayImage ? <AvatarImage src={displayImage} alt="" /> : null}
              <AvatarFallback aria-hidden="true">{initialsFor(displayName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" data-testid="dashboard-identity-name">
                {displayName || "Your account"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {displayEmail || "Signed in"}
              </p>
            </div>
            {displayRole ? (
              <span className="hidden shrink-0 rounded-full bg-mist px-2 py-0.5 text-[11px] font-semibold text-foreground sm:inline dark:bg-surface-alt">
                {roleLabel(displayRole)}
              </span>
            ) : null}
          </div>
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
