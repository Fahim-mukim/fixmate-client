export const BOOKING_ROLE_LABELS = Object.freeze({
  customer: "Customer dashboard",
  technician: "Technician dashboard",
  admin: "Admin dashboard",
});

const DASHBOARD_LINKS = Object.freeze({
  customer: Object.freeze([
    { href: "/dashboard/customer", label: "Overview" },
    { href: "/dashboard/customer/bookings", label: "My bookings" },
    { href: "/dashboard/customer/payments", label: "Payments" },
  ]),
  technician: Object.freeze([
    { href: "/dashboard/technician", label: "Overview" },
    { href: "/dashboard/technician/requests", label: "Requests" },
  ]),
  admin: Object.freeze([
    { href: "/dashboard/admin", label: "Overview" },
    { href: "/dashboard/admin/bookings", label: "Bookings" },
  ]),
});

export function dashboardLinksForRole(role) {
  return DASHBOARD_LINKS[role] ?? Object.freeze([]);
}

export function dashboardLinkCount(role) {
  return dashboardLinksForRole(role).length;
}
