import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";
import PaymentSuccessPanel from "@/components/payments/payment-success-panel.jsx";
import { readPaymentSessionId } from "@/lib/payment-ui-contract.js";

export const metadata = {
  title: "Payment status",
  description: "View the server-confirmed status of a FixMate payment.",
};

export default async function PaymentSuccessPage({ searchParams }) {
  const sessionId = readPaymentSessionId(await searchParams);

  return (
    <DashboardGate
      expectedRole="customer"
      title="Payment status"
      description="This status comes from the server, not from the return link."
    >
      <PaymentSuccessPanel key={sessionId || "missing"} sessionId={sessionId} />
    </DashboardGate>
  );
}
