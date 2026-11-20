import { AlertCircle, Inbox, ServerCrash } from "lucide-react";

import ButtonLink from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";

export function ServicesSkeleton({ count = 6 }) {
  return (
    <div
      aria-label="Loading services"
      className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border bg-surface p-3"
        >
          <Skeleton className="aspect-4/3 w-full rounded-xl" />
          <div className="space-y-3 px-1 pt-4 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div aria-label="Loading service details" className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-12 w-3/4 max-w-xl" />
      <Skeleton className="aspect-16/7 w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function EmptyState({
  title = "No services found",
  description,
  href = "/services",
  actionLabel = "Clear filters",
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <Inbox aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <ButtonLink href={href} variant="outline" className="mt-6">
        {actionLabel}
      </ButtonLink>
    </div>
  );
}

export function ErrorState({
  title = "We couldn’t load services",
  description,
  href = "/services",
  actionLabel = "Try again",
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-danger/35 bg-danger/5 px-6 py-12"
    >
      <ServerCrash aria-hidden="true" className="mx-auto size-8 text-danger" />
      <h3 className="mt-4 text-xl font-semibold text-center">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground text-center">
        {description}
      </p>
      <div className="mt-6 flex justify-center">
        <ButtonLink href={href} variant="outline">
          {actionLabel}
        </ButtonLink>
      </div>
    </div>
  );
}

export function Notice({ children }) {
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-sm text-foreground"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
      <span>{children}</span>
    </p>
  );
}

export function serviceErrorCopy(reason) {
  switch (reason) {
    case "configuration":
      return {
        title: "Service API is not configured",
        description:
          "Set FIXMATE_SERVER_API_URL for the Client to enable public service discovery. No sample services are shown.",
      };
    case "invalid-id":
      return {
        title: "That service link isn’t valid",
        description: "The service ID must be a valid 24-character identifier.",
      };
    case "not-found":
      return {
        title: "Service not found",
        description:
          "This service is unavailable, or it is not an approved public listing.",
      };
    case "invalid-response":
      return {
        title: "Unexpected service response",
        description:
          "The service API returned data that the Client could not display safely.",
      };
    default:
      return {
        title: "Service API is unavailable",
        description:
          "The service API could not be reached. Please try again later.",
      };
  }
}
