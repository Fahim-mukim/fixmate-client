"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import FixMateLogo from "@/components/brand/fixmate-logo";
import ButtonLink from "@/components/ui/button-link";
import PageContainer from "@/components/layout/page-container";
import { primaryNavLinks as navLinks } from "@/components/layout/navigation-links";
import ThemeToggle from "@/components/layout/theme-toggle";
import AccountMenu from "@/components/layout/account-menu";
import { useSession } from "@/lib/auth-client.js";
import { getCurrentApplicationUser } from "@/lib/protected-api.js";
import {
  clearSessionIdentity,
  setSessionIdentity,
  useSessionIdentity,
} from "@/lib/session-identity.js";
import { cn } from "cn";

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  if (href.includes("#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session, isPending } = useSession();
  const identity = useSessionIdentity();
  const sessionUser = session?.user ?? null;
  const loggedIn = !isPending && Boolean(sessionUser);

  // Authoritative identity is loaded only after the session is known. The
  // shared store also receives profile-save updates elsewhere in the app.
  useEffect(() => {
    if (!loggedIn) {
      clearSessionIdentity();
      return undefined;
    }

    let active = true;
    getCurrentApplicationUser()
      .then((user) => {
        if (active) setSessionIdentity(user);
      })
      .catch(() => {
        // Session display values remain available until a retry or refresh.
      });

    return () => {
      active = false;
    };
  }, [loggedIn, sessionUser?.id]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <PageContainer className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="FixMate home"
          className="flex min-w-0 items-center rounded-md"
        >
          <FixMateLogo priority />
        </Link>

        <nav aria-label="Primary navigation" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-mist hover:text-foreground dark:hover:bg-surface-alt",
                    isActive(pathname, link.href) &&
                      "bg-mist text-foreground dark:bg-surface-alt"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {loggedIn ? (
            <AccountMenu identity={identity} sessionUser={sessionUser} />
          ) : (
            <>
              <ButtonLink href="/sign-in" variant="outline" size="sm" className="hidden sm:inline-flex">
                Sign in
              </ButtonLink>
              <ButtonLink href="/sign-up" size="sm" className="hidden sm:inline-flex">
                Sign up
              </ButtonLink>
            </>
          )}
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground md:hidden"
          >
            {menuOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </PageContainer>

      {menuOpen ? (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-border bg-background md:hidden"
        >
          <PageContainer className="py-3">
            <ul className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={
                      isActive(pathname, link.href) ? "page" : undefined
                    }
                    className={cn(
                      "block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-mist hover:text-foreground dark:hover:bg-surface-alt",
                      isActive(pathname, link.href) &&
                        "bg-mist text-foreground dark:bg-surface-alt"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {!loggedIn ? (
                <li className="grid gap-2 pt-1 sm:hidden">
                  <ButtonLink
                    href="/sign-in"
                    variant="outline"
                    className="w-full"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign in
                  </ButtonLink>
                  <ButtonLink
                    href="/sign-up"
                    className="w-full"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign up
                  </ButtonLink>
                </li>
              ) : null}
            </ul>
          </PageContainer>
        </nav>
      ) : null}
    </header>
  );
}
