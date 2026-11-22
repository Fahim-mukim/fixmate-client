"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BOOKING_PAYMENT_STATUSES,
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  bookingPaymentLabel,
} from "@/lib/booking-contract.js";

export default function BookingFilters({
  status = "",
  onStatusChange,
  paymentStatus = "",
  onPaymentStatusChange,
  search = "",
  onSearchChange,
  showPaymentStatus = false,
  showSearch = false,
  onRefresh,
  refreshing = false,
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
      {showSearch ? (
        <div className="min-w-56 flex-1 space-y-2">
          <Label htmlFor="booking-search-filter">Search bookings</Label>
          <Input
            id="booking-search-filter"
            type="search"
            value={search}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="Service, customer, or technician"
            autoComplete="off"
          />
        </div>
      ) : null}

      <div className="min-w-48 flex-1 space-y-2">
        <Label htmlFor="booking-status-filter">Booking status</Label>
        <select
          id="booking-status-filter"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="">All statuses</option>
          {BOOKING_STATUSES.map((value) => (
            <option key={value} value={value}>
              {BOOKING_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      {showPaymentStatus ? (
        <div className="min-w-48 flex-1 space-y-2">
          <Label htmlFor="booking-payment-status-filter">Payment status</Label>
          <select
            id="booking-payment-status-filter"
            value={paymentStatus}
            onChange={(event) => onPaymentStatusChange?.(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="">All payment statuses</option>
            {BOOKING_PAYMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {bookingPaymentLabel(value)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        aria-busy={refreshing}
      >
        <RefreshCw aria-hidden="true" className="size-4" />
        {refreshing ? "Refreshing…" : "Refresh"}
      </Button>
    </div>
  );
}
