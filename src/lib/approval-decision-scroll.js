const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return Boolean(window.matchMedia?.(REDUCED_MOTION_QUERY).matches);
}

export function scrollApprovalDecisionIntoView(element) {
  if (!element || typeof element.scrollIntoView !== "function") return false;

  element.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
  return true;
}
