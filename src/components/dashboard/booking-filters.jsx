"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
} from "@/lib/booking-contract.js";

export default function BookingFilters({
  status = "",
  onStatusChange,
  onRefresh,
  refreshing = false,
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="min-w-48 flex-1 space-y-2">
        <Label htmlFor="booking-status-filter">Filter by booking status</Label>
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
