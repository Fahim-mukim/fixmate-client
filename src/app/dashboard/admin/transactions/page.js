import AdminTransactionsPanel from "@/components/dashboard/admin-transactions-panel.jsx";
import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";

export const metadata = {
  title: "Admin transactions",
  description: "Inspect read-only payment transaction records with safe fields only.",
};

export default function AdminTransactionsPage() {
  return (
    <DashboardGate
      expectedRole="admin"
      title="Transactions"
      description="Inspect service, customer, technician, amount, status, and dates. The Server enforces Admin authorization and this page makes no payment changes."
    >
      <AdminTransactionsPanel />
    </DashboardGate>
  );
}
