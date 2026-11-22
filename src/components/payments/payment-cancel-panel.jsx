import { CreditCard } from "lucide-react";

import ButtonLink from "@/components/ui/button-link";
import { CUSTOMER_BOOKINGS_PATH } from "@/lib/payment-ui-contract.js";

export default function PaymentCancelPanel() {
  return (
    <section
      aria-labelledby="payment-cancel-heading"
      className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface px-6 py-12 text-center"
    >
      <CreditCard aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
      <h2 id="payment-cancel-heading" className="mt-4 text-xl font-semibold">
        Checkout wasn’t completed
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        You left the hosted Checkout page before finishing. This page does not change
        any payment or booking record and does not confirm a payment.
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Return to your bookings. If a completed booking is still unpaid and eligible,
        you can start Checkout again from Pay Now.
      </p>
      <ButtonLink href={CUSTOMER_BOOKINGS_PATH} className="mt-6">
        Back to my bookings
      </ButtonLink>
    </section>
  );
}
