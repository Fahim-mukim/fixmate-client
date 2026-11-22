import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";
import TechnicianRequestsPanel from "@/components/dashboard/technician-requests-panel.jsx";

export const metadata = {
  title: "Technician dashboard",
  description: "Review incoming FixMate repair requests.",
};

export default function TechnicianDashboardPage() {
  return (
    <DashboardGate
      expectedRole="technician"
      title="Your incoming work at a glance"
      description="Review the newest requests assigned to your services and open the full queue when you are ready."
    >
      <TechnicianRequestsPanel compact />
    </DashboardGate>
  );
}
