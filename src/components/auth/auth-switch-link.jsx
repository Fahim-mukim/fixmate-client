"use client";

import { useSyncExternalStore } from "react";

import ButtonLink from "@/components/ui/button-link.jsx";
import { nextParamFromSearch, safeReturnPath } from "@/lib/return-url.js";

function subscribeToNavigation(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("popstate", callback);
  };
}

function getCurrentNext() {
  if (typeof window === "undefined") return null;
  const value = nextParamFromSearch(window.location.search);
  const safe = safeReturnPath(value, null);
  return safe === "/" ? null : safe;
}

function getServerNext() {
  return null;
}

// Keeps a safe return path when a user switches between sign-in and sign-up.
// useSyncExternalStore keeps the server render at the neutral href and adopts
// the browser value after hydration without a state-setting effect.
export default function AuthSwitchLink({ href, children, ...props }) {
  const next = useSyncExternalStore(
    subscribeToNavigation,
    getCurrentNext,
    getServerNext,
  );

  const resolvedHref = next ? `${href}?next=${encodeURIComponent(next)}` : href;

  return (
    <ButtonLink href={resolvedHref} {...props}>
      {children}
    </ButtonLink>
  );
}
