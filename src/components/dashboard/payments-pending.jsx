import { CreditCard } from "lucide-react";

import ButtonLink from "@/components/ui/button-link";

export default function PaymentsPending() {
  return (
    <section
      aria-labelledby="payments-pending-heading"
      className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center"
    >
      <CreditCard aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
      <h2 id="payments-pending-heading" className="mt-4 text-lg font-semibold">
        Payments are not available yet
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        This phase covers booking requests only. No payment actions or payment records
        are shown, and no fake data is displayed.
      </p>
      <ButtonLink href="/dashboard/customer/bookings" variant="outline" className="mt-6">
        View my bookings
      </ButtonLink>
    </section>
  );
}
