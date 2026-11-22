export const BOOKING_ROLE_LABELS = Object.freeze({
  customer: "Customer dashboard",
  technician: "Technician dashboard",
  admin: "Admin dashboard",
});

const PROFILE_LINK = Object.freeze({ href: "/dashboard/profile", label: "Profile" });

const DASHBOARD_LINKS = Object.freeze({
  customer: Object.freeze([
    { href: "/dashboard/customer", label: "Overview" },
    { href: "/dashboard/customer/bookings", label: "My bookings" },
    { href: "/dashboard/customer/payments", label: "Payments" },
    PROFILE_LINK,
  ]),
  technician: Object.freeze([
    { href: "/dashboard/technician", label: "Overview" },
    { href: "/dashboard/technician/my-services", label: "My services" },
    { href: "/dashboard/technician/add-service", label: "Add service" },
    { href: "/dashboard/technician/requests", label: "Requests" },
    PROFILE_LINK,
  ]),
  admin: Object.freeze([
    { href: "/dashboard/admin", label: "Overview" },
    { href: "/dashboard/admin/bookings", label: "Bookings" },
    { href: "/dashboard/admin/services", label: "Services" },
    PROFILE_LINK,
  ]),
});

export function dashboardLinksForRole(role) {
  return DASHBOARD_LINKS[role] ?? Object.freeze([]);
}

export function dashboardLinkCount(role) {
  return dashboardLinksForRole(role).length;
}
