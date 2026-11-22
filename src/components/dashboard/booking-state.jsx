"use client";

import { AlertCircle, Inbox, ServerCrash } from "lucide-react";

import ButtonLink from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { bookingErrorMessage } from "@/lib/booking-contract.js";

export function BookingLoading({ label = "Loading bookings" }) {
  return (
    <div aria-label={label} className="space-y-3">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

export function BookingEmpty({ title, description, href, actionLabel }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <Inbox aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {href && actionLabel ? (
        <ButtonLink href={href} variant="outline" className="mt-5">
          {actionLabel}
        </ButtonLink>
      ) : null}
    </div>
  );
}

export function BookingError({ result, onRetry, title = "We couldn’t load bookings" }) {
  const message = bookingErrorMessage(result, "Please try again.");
  const expired = result?.status === 401;

  return (
    <div
      role="alert"
      className="rounded-2xl border border-danger/35 bg-danger/5 px-6 py-12 text-center"
    >
      <ServerCrash aria-hidden="true" className="mx-auto size-8 text-danger" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {expired ? (
          <ButtonLink href="/sign-in">Sign in</ButtonLink>
        ) : (
          <Button type="button" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )}
        <ButtonLink href="/services" variant="ghost">
          Browse services
        </ButtonLink>
      </div>
    </div>
  );
}

export function BookingInlineNotice({ children, tone = "info" }) {
  const Icon = tone === "error" ? AlertCircle : Inbox;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className="flex items-start gap-2 rounded-lg border border-border bg-mist px-3 py-2 text-sm leading-6 text-foreground dark:bg-surface-alt"
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
