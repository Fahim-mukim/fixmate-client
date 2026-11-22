import {
  BOOKING_STATUS_LABELS,
  bookingStatusClass,
} from "@/lib/booking-contract.js";
import { cn } from "cn";

export default function BookingStatusBadge({ status }) {
  const label = BOOKING_STATUS_LABELS[status] ?? "Unknown";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        bookingStatusClass(status),
      )}
    >
      {label}
    </span>
  );
}
