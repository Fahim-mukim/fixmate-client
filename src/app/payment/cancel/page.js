import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";
import PaymentCancelPanel from "@/components/payments/payment-cancel-panel.jsx";

export const metadata = {
  title: "Payment cancelled",
  description: "Continue from your FixMate bookings after leaving Checkout.",
};

export default function PaymentCancelPage() {
  return (
    <DashboardGate
      expectedRole="customer"
      title="Payment cancelled"
      description="Checkout did not finish. Your records have not been changed by this page."
    >
      <PaymentCancelPanel />
    </DashboardGate>
  );
}
