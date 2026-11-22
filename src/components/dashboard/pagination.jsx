"use client";

import { Button } from "@/components/ui/button";

export default function BookingPagination({ page = 1, totalPages = 0, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Booking pages"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3"
    >
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
