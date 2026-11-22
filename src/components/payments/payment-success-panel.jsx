"use client";

import { useEffect, useState } from "react";

import ButtonLink from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  bookingPaymentLabel,
  bookingReference,
  formatBookingAmount,
  formatBookingDate,
} from "@/lib/booking-contract.js";
import { paymentApi } from "@/lib/payment-api.js";
import {
  CUSTOMER_BOOKINGS_PATH,
  isPendingPaymentStatus,
  isRetryablePaymentError,
  isUncompletedPaymentStatus,
  paymentStatusLabel,
  paymentStatusPresentation,
  sessionErrorMessage,
} from "@/lib/payment-ui-contract.js";
import { cn } from "cn";

const MISSING_SESSION_RESULT = Object.freeze({
  status: 400,
  code: "INVALID_SESSION_ID",
  message: "That payment link is not valid.",
});

const TONE_CLASSES = Object.freeze({
  pending: "border-warning/35 bg-warning/8 text-warning",
  success: "border-success/35 bg-success/10 text-success",
  error: "border-danger/35 bg-danger/5 text-danger",
  unknown: "border-border bg-mist text-foreground dark:bg-surface-alt",
});

function DetailRow({ label, value }) {
  return (
    <div className="border-b border-border py-2 last:border-b-0">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-6 break-words">{value}</dd>
    </div>
  );
}

export default function PaymentSuccessPanel({ sessionId }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState(() =>
    sessionId
      ? { status: "loading", data: null, result: null }
      : { status: "error", data: null, result: MISSING_SESSION_RESULT },
  );

  useEffect(() => {
    if (!sessionId) return undefined;

    let active = true;

    paymentApi.getSessionPayment(sessionId).then((result) => {
      if (!active) return;
      if (result.ok) {
        setState({ status: "ready", data: result.data, result: null });
      } else {
        setState({ status: "error", data: null, result });
      }
    });

    return () => {
      active = false;
    };
  }, [sessionId, attempt]);

  if (state.status === "loading") {
    return (
      <div aria-label="Loading payment status" aria-busy="true" className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-2/3 max-w-xl" />
        <Skeleton className="h-5 w-full max-w-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  if (state.status === "error") {
    const result = state.result;
    const retryable = isRetryablePaymentError(result);

    return (
      <div role="alert" className="mx-auto max-w-2xl rounded-2xl border border-danger/35 bg-danger/5 px-6 py-10 text-center">
        <h2 className="text-xl font-semibold">Payment status unavailable</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {sessionErrorMessage(result)}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {result?.status === 401 ? (
            <ButtonLink href="/sign-in">Sign in</ButtonLink>
          ) : null}
          {retryable ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setState({ status: "loading", data: null, result: null });
                setAttempt((value) => value + 1);
              }}
            >
              Try again
            </Button>
          ) : null}
          <ButtonLink href={CUSTOMER_BOOKINGS_PATH} variant={retryable ? "ghost" : "outline"}>
            View my bookings
          </ButtonLink>
        </div>
      </div>
    );
  }

  const data = state.data;
  const status = typeof data?.status === "string" ? data.status : "";
  const presentation = paymentStatusPresentation(status);
  let nextStep = "Return to your bookings to continue.";

  if (isPendingPaymentStatus(status)) {
    nextStep = "The final confirmation may still be arriving. Refresh this page to check again.";
  } else if (status === "paid") {
    nextStep = "The server has recorded this payment. You can safely return to your bookings.";
  } else if (isUncompletedPaymentStatus(status)) {
    nextStep = "Return to your bookings. Use Pay Now again only if the booking is still eligible.";
  }

  return (
    <section aria-labelledby="payment-status-heading" className="mx-auto max-w-2xl space-y-5">
      <div
        className={cn(
          "rounded-2xl border px-6 py-5",
          TONE_CLASSES[presentation.tone] ?? TONE_CLASSES.unknown,
        )}
      >
        <p className="text-xs font-semibold tracking-wide uppercase">Server-confirmed status</p>
        <h2 id="payment-status-heading" className="mt-2 text-2xl font-semibold">
          {presentation.heading}
        </h2>
        <p className="mt-2 text-sm leading-6">{presentation.description}</p>
        <p className="mt-3 text-sm leading-6">{nextStep}</p>
        <p className="mt-3 text-sm font-semibold">Payment status: {paymentStatusLabel(status)}</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface px-6 py-5">
        <dl>
          <DetailRow label="Service" value={data.serviceTitle || "Service not provided"} />
          <DetailRow label="Amount" value={formatBookingAmount(data.amount)} />
          <DetailRow label="Booking reference" value={bookingReference(data.bookingId)} />
          <DetailRow
            label="Booking payment status"
            value={bookingPaymentLabel(data.bookingPaymentStatus)}
          />
          {typeof data.paidAt === "string" ? (
            <DetailRow
              label="Paid at"
              value={formatBookingDate(data.paidAt, { withTime: true })}
            />
          ) : null}
        </dl>
      </div>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={CUSTOMER_BOOKINGS_PATH}>Back to my bookings</ButtonLink>
      </div>
    </section>
  );
}
