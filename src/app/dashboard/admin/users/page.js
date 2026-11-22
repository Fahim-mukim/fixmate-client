import AdminUsersPanel from "@/components/dashboard/admin-users-panel.jsx";
import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";

export const metadata = {
  title: "Admin users",
  description: "Inspect registered FixMate accounts with safe profile fields only.",
};

export default function AdminUsersPage() {
  return (
    <DashboardGate
      expectedRole="admin"
      title="All users"
      description="Inspect registered accounts by role, name, or email. Admins can change other users' roles; the Server enforces Admin authorization and blocks self-role changes."
    >
      <AdminUsersPanel />
    </DashboardGate>
  );
}
