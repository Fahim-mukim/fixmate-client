import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";
import TechnicianServicesPanel from "@/components/dashboard/technician-services-panel.jsx";

export const metadata = {
  title: "My services",
  description: "Review and manage your FixMate service listings.",
};

export default function MyServicesPage() {
  return (
    <DashboardGate
      expectedRole="technician"
      title="My services"
      description="Create, edit, and remove only the services you own. Changed listings return to Admin review."
    >
      <TechnicianServicesPanel />
    </DashboardGate>
  );
}
