"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  BOOKING_STATUS_LABELS,
  bookingPaymentLabel,
  bookingReference,
  formatBookingAmount,
  formatBookingDate,
} from "@/lib/booking-contract.js";
import { cn } from "cn";

function DetailRow({ label, value }) {
  return (
    <div className="border-b border-border py-2 last:border-b-0">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-6 break-words">{value}</dd>
    </div>
  );
}

export default function BookingDetail({
  booking,
  role,
  detail,
  detailLoading = false,
  onOpen,
  children,
}) {
  const [open, setOpen] = useState(false);
  const detailId = `booking-detail-${booking._id ?? "unknown"}`;
  const shown = detail ?? booking;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) onOpen?.(booking._id);
  }

  return (
    <div className="border-t border-border px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Reference {bookingReference(booking._id)} · Booked{" "}
          {formatBookingDate(booking.createdAt, { withTime: true })}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={detailId}
        >
          {open ? "Hide details" : "View details"}
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </Button>
      </div>

      {open ? (
        <div id={detailId} className="mt-4 grid gap-6 md:grid-cols-2">
          {detailLoading ? (
            <p role="status" className="text-sm text-muted-foreground">
              Loading the latest booking details…
            </p>
          ) : null}
          <dl>
            <DetailRow label="Service" value={shown.serviceTitle || "Service not provided"} />
            <DetailRow label="Category" value={shown.serviceCategory || "Not provided"} />
            <DetailRow
              label="Technician"
              value={shown.technicianName || "Technician not provided"}
            />
            <DetailRow
              label="Preferred date"
              value={formatBookingDate(shown.preferredDate)}
            />
            <DetailRow label="Base price" value={formatBookingAmount(shown.basePrice)} />
          </dl>

          <dl>
            {role !== "technician" ? (
              <DetailRow
                label="Technician email"
                value={shown.technicianEmail || "Not provided"}
              />
            ) : null}
            {role !== "customer" ? (
              <>
                <DetailRow
                  label="Customer"
                  value={shown.customerName || "Customer not provided"}
                />
                <DetailRow
                  label="Customer email"
                  value={shown.customerEmail || "Not provided"}
                />
                <DetailRow
                  label="Customer phone"
                  value={shown.customerPhone || "Not provided"}
                />
              </>
            ) : null}
            <DetailRow label="Service address" value={shown.address || "Not provided"} />
            <DetailRow
              label="Booking status"
              value={BOOKING_STATUS_LABELS[shown.status] || "Unknown"}
            />
            <DetailRow label="Payment status" value={bookingPaymentLabel(shown.paymentStatus)} />
            <DetailRow label="Final amount" value={formatBookingAmount(shown.finalAmount)} />
          </dl>

          <div className="md:col-span-2">
            <DetailRow
              label="Problem description"
              value={shown.problemDescription || "No description was provided."}
            />
          </div>

          {children ? <div className="md:col-span-2">{children}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
