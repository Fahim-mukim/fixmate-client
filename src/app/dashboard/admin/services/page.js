import AdminServicesPanel from "@/components/dashboard/admin-services-panel.jsx";
import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";

export const metadata = {
  title: "Admin service moderation",
  description: "Inspect submitted FixMate services before setting approval status.",
};

export default function AdminServicesPage() {
  return (
    <DashboardGate
      expectedRole="admin"
      title="Service moderation"
      description="Inspect each submitted service in full before approving or rejecting it. The Server enforces Admin authorization."
    >
      <AdminServicesPanel />
    </DashboardGate>
  );
}
