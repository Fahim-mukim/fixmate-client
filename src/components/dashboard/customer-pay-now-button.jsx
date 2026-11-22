"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast.jsx";
import { paymentApi } from "@/lib/payment-api.js";
import { createSubmissionGuard } from "@/lib/booking-contract.js";
import {
  canCustomerPayNow,
  checkoutErrorMessage,
  readCheckoutRedirect,
} from "@/lib/payment-ui-contract.js";

export default function CustomerPayNowButton({ booking, role }) {
  const [state, setState] = useState({ status: "idle", message: "" });
  const submissionGuard = useRef(createSubmissionGuard());

  if (!canCustomerPayNow(role, booking)) return null;

  const pending = state.status === "loading" || state.status === "redirecting";

  async function handlePayNow() {
    if (!submissionGuard.current.begin()) return;

    setState({ status: "loading", message: "" });
    try {
      const result = await paymentApi.startCheckout(booking._id);

      if (!result.ok) {
        const message = checkoutErrorMessage(result);
        setState({ status: "error", message });
        toast.add({ type: "error", title: "Checkout failed", description: message });
        return;
      }

      const checkoutUrl = readCheckoutRedirect(result.data);
      if (!checkoutUrl) {
        const message = "The payment response could not be verified. Try again.";
        setState({ status: "error", message });
        toast.add({ type: "error", title: "Checkout failed", description: message });
        return;
      }

      setState({ status: "redirecting", message: "" });
      window.location.assign(checkoutUrl);
    } finally {
      submissionGuard.current.finish();
    }
  }

  return (
    <div className="border-t border-border px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Pay for this completed service</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            You’ll continue to secure Stripe Checkout. The amount is set by the
            server from this booking.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handlePayNow}
          disabled={pending}
          aria-busy={pending}
        >
          {state.status === "redirecting"
            ? "Opening Checkout…"
            : state.status === "loading"
              ? "Starting Checkout…"
              : "Pay Now"}
        </Button>
      </div>

      {state.status === "error" ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
