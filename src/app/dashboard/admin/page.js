import AdminBookingsPanel from "@/components/dashboard/admin-bookings-panel.jsx";
import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";

export const metadata = {
  title: "Admin dashboard",
  description: "Inspect FixMate bookings from persisted data.",
};

export default function AdminDashboardPage() {
  return (
    <DashboardGate
      expectedRole="admin"
      title="Platform overview"
      description="Read-only booking inspection is available here. Assignment-wide admin actions remain in later phases."
    >
      <AdminBookingsPanel compact />
    </DashboardGate>
  );
}
