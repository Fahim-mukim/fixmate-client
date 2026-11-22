import AdminBookingsPanel from "@/components/dashboard/admin-bookings-panel.jsx";
import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";

export const metadata = {
  title: "Admin bookings",
  description: "Inspect all FixMate booking records with read-only status views.",
};

export default function AdminBookingsPage() {
  return (
    <DashboardGate
      expectedRole="admin"
      title="All bookings"
      description="Inspect customer, technician, service, date, status, payment, and amount data. Admin status overrides are not available."
    >
      <AdminBookingsPanel />
    </DashboardGate>
  );
}
