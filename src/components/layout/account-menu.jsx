"use client";

import { ChevronDown, LayoutDashboard, Loader2, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { dashboardHrefForRole } from "@/lib/booking-contract.js";
import { BOOKING_ROLE_LABELS } from "@/lib/dashboard-navigation.js";
import { safeProfileImageUrl } from "@/lib/profile-contract.js";
import { signOutCurrentSession } from "@/lib/sign-out.js";

function initialsFor(name) {
  const parts = (typeof name === "string" ? name : "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FM";
  return `${parts[0][0]}${parts.length > 1 ? parts[parts.length - 1][0] : ""}`.toUpperCase();
}

function roleLabel(role) {
  return BOOKING_ROLE_LABELS[role]?.replace(" dashboard", "") ?? "";
}

export default function AccountMenu({ identity, sessionUser }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  // The session supplies immediate display values; role and dashboard access
  // only come from the authoritative application identity.
  const name = identity?.name || (typeof sessionUser?.name === "string" ? sessionUser.name : "");
  const email = identity?.email || (typeof sessionUser?.email === "string" ? sessionUser.email : "");
  const image = identity?.image ?? safeProfileImageUrl(sessionUser?.image);
  const role = identity?.role || "";
  const dashboardHref = role ? dashboardHrefForRole(role) : "";

  async function handleSignOut() {
    if (signingOut) return;
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
      toast.add({
        title: "Sign out failed",
        description: "Sign out did not complete. Please try again.",
        type: "error",
      });
      setSigningOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className="inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Avatar size="sm" className="size-8">
          {image ? <AvatarImage src={image} alt="" /> : null}
          <AvatarFallback aria-hidden="true">{initialsFor(name)}</AvatarFallback>
        </Avatar>
        <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
            <span className="truncate text-sm font-medium text-foreground">
              {name || "Your account"}
            </span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {email || "Signed in"}
            </span>
            {role ? (
              <span className="mt-1 w-fit rounded-full bg-mist px-2 py-0.5 text-[11px] font-semibold text-foreground dark:bg-surface-alt">
                {roleLabel(role)}
              </span>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {dashboardHref ? (
            <DropdownMenuItem render={<Link href={dashboardHref} />}>
              <LayoutDashboard aria-hidden="true" />
              {roleLabel(role)} dashboard
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem render={<Link href="/dashboard/profile" />}>
            <UserRound aria-hidden="true" />
            Update Profile
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={handleSignOut}
            disabled={signingOut}
            aria-busy={signingOut}
            variant="destructive"
          >
            {signingOut ? <Loader2 aria-hidden="true" className="animate-spin" /> : <LogOut aria-hidden="true" />}
            {signingOut ? "Signing out…" : "Sign Out"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
