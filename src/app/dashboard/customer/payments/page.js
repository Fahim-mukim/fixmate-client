import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";
import PaymentsPending from "@/components/dashboard/payments-pending.jsx";

export const metadata = {
  title: "Payments",
  description: "Start secure Checkout from an eligible completed booking.",
};

export default function CustomerPaymentsPage() {
  return (
    <DashboardGate
      expectedRole="customer"
      title="Payments"
      description="Use Pay Now on a completed, unpaid booking and review its server-confirmed status."
    >
      <PaymentsPending />
    </DashboardGate>
  );
}
