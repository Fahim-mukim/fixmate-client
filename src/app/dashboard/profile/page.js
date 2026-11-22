import DashboardGate from "@/components/dashboard/dashboard-gate.jsx";
import ProfilePanel from "@/components/dashboard/profile-panel.jsx";

export const metadata = {
  title: "Profile",
  description: "View and update your FixMate profile details.",
};

export default function ProfilePage() {
  return (
    <DashboardGate
      allowAnyRole
      title="Your profile"
      description="Review your account details and keep your contact information current."
    >
      <ProfilePanel />
    </DashboardGate>
  );
}
