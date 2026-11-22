import { CreditCard } from "lucide-react";

import ButtonLink from "@/components/ui/button-link";
import { CUSTOMER_BOOKINGS_PATH } from "@/lib/payment-ui-contract.js";

export default function PaymentsPending() {
  return (
    <section
      aria-labelledby="customer-payments-heading"
      className="rounded-2xl border border-border bg-surface px-6 py-12 text-center"
    >
      <CreditCard aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
      <h2 id="customer-payments-heading" className="mt-4 text-lg font-semibold">
        Pay for a completed booking
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Pay Now appears on completed bookings that are still unpaid. You’ll finish on
        Stripe Checkout, then return here to see the server-confirmed payment status.
      </p>
      <ButtonLink href={CUSTOMER_BOOKINGS_PATH} variant="outline" className="mt-6">
        View my bookings
      </ButtonLink>
    </section>
  );
}
