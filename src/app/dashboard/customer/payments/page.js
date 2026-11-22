import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";
import PaymentsPending from "@/components/dashboard/payments-pending.jsx";

export const metadata = {
  title: "Payments",
  description: "Payment features are pending in this phase.",
};

export default function CustomerPaymentsPage() {
  return (
    <DashboardGate
      expectedRole="customer"
      title="Payments"
      description="Payment handling is intentionally outside this phase."
    >
      <PaymentsPending />
    </DashboardGate>
  );
}
