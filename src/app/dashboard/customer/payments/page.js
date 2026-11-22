import CustomerPaymentHistory from "@/components/dashboard/customer-payment-history.jsx";
import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";

export const metadata = {
  title: "Payments",
  description: "Review your server-confirmed payment history.",
};

export default function CustomerPaymentsPage() {
  return (
    <DashboardGate
      expectedRole="customer"
      title="Payments"
      description="Review your payment history and the server-confirmed status of each payment."
    >
      <CustomerPaymentHistory />
    </DashboardGate>
  );
}
