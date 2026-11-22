import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";
import TechnicianRequestsPanel from "@/components/dashboard/technician-requests-panel.jsx";

export const metadata = {
  title: "Booking requests",
  description: "Manage incoming FixMate repair requests.",
};

export default function TechnicianRequestsPage() {
  return (
    <DashboardGate
      expectedRole="technician"
      title="Booking requests"
      description="Accept, reject, start, and complete only the transitions allowed for the current status."
    >
      <TechnicianRequestsPanel />
    </DashboardGate>
  );
}
