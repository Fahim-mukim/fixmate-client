import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";
import ServiceForm from "@/components/dashboard/service-form.jsx";

export const metadata = {
  title: "Add service",
  description: "Create a technician service listing for FixMate.",
};

export default function AddServicePage() {
  return (
    <DashboardGate
      expectedRole="technician"
      title="Add a service"
      description="Upload a service image and list the details customers will see after Admin approval."
    >
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <ServiceForm mode="create" />
      </section>
    </DashboardGate>
  );
}
