import AdminBookingsPanel from "@/components/dashboard/admin-bookings-panel.jsx";
import AdminDashboardStats from "@/components/dashboard/admin-dashboard-stats.jsx";
import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";

export const metadata = {
  title: "Admin dashboard",
  description: "Inspect FixMate platform statistics and bookings from persisted data.",
};

export default function AdminDashboardPage() {
  return (
    <DashboardGate
      expectedRole="admin"
      title="Platform overview"
      description="Review global platform statistics and recent bookings. Counts are server-side and not derived from paginated tables."
    >
      <div className="space-y-8">
        <AdminDashboardStats />
        <AdminBookingsPanel compact />
      </div>
    </DashboardGate>
  );
}
