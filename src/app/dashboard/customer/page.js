import CustomerBookingsPanel from "@/components/dashboard/customer-bookings-panel.jsx";
import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";

export const metadata = {
  title: "Customer dashboard",
  description: "Review your recent FixMate booking requests.",
};

export default function CustomerDashboardPage() {
  return (
    <DashboardGate
      expectedRole="customer"
      title="Your repair requests at a glance"
      description="Follow your recent service requests. All data below comes from your own authenticated bookings."
    >
      <CustomerBookingsPanel compact />
    </DashboardGate>
  );
}
