import CustomerBookingsPanel from "@/components/dashboard/customer-bookings-panel.jsx";
import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";

export const metadata = {
  title: "My bookings",
  description: "View and cancel your FixMate booking requests.",
};

export default function CustomerBookingsPage() {
  return (
    <DashboardGate
      expectedRole="customer"
      title="My bookings"
      description="Review service details, track statuses, and cancel a request while it is still pending."
    >
      <CustomerBookingsPanel />
    </DashboardGate>
  );
}
