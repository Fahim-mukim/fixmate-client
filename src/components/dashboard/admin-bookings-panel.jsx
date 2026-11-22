"use client";

import { useCallback, useEffect, useState } from "react";

import { bookingApi } from "@/lib/booking-api.js";
import {
  DEFAULT_BOOKING_LIMIT,
  bookingPaymentLabel,
  bookingViewState,
  formatBookingAmount,
  formatBookingDate,
  getAdminActions,
} from "@/lib/booking-contract.js";
import BookingDetail from "./booking-detail.jsx";
import BookingFilters from "./booking-filters.jsx";
import {
  BookingEmpty,
  BookingError,
  BookingLoading,
} from "./booking-state.jsx";
import BookingPagination from "./pagination.jsx";
import BookingStatusBadge from "./booking-status-badge.jsx";
import BookingSummary from "./booking-summary.jsx";

export default function AdminBookingsPanel({ compact = false }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const limit = compact ? 5 : DEFAULT_BOOKING_LIMIT;

  const load = useCallback(
    async (nextPage = page, nextStatus = statusFilter) => {
      setLoading(true);
      setError(null);
      const result = await bookingApi.listAdminBookings({
        page: nextPage,
        status: nextStatus || undefined,
        limit,
      });

      if (result.ok) {
        setData(result.data);
      } else {
        setError(result);
        setData(null);
      }
      setLoading(false);
    },
    [limit, page, statusFilter],
  );

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  function handleStatusChange(value) {
    setStatusFilter(value);
    setPage(1);
  }

  const state = bookingViewState({ loading, error, items: data?.items });
  const readOnly = getAdminActions().length === 0;

  return (
    <section aria-labelledby="admin-bookings-heading" className="space-y-6">
      <BookingSummary
        items={data?.items}
        total={data?.total}
        note={compact ? "Most recent bookings" : "On this page"}
      />

      {compact ? null : (
        <BookingFilters
          status={statusFilter}
          onStatusChange={handleStatusChange}
          onRefresh={() => load()}
          refreshing={loading}
        />
      )}

      <div>
        <h2 id="admin-bookings-heading" className="sr-only">
          Booking overview
        </h2>

        {state === "loading" ? <BookingLoading /> : null}

        {state === "error" ? (
          <BookingError result={error} onRetry={() => load()} />
        ) : null}

        {state === "empty" ? (
          <BookingEmpty
            title={statusFilter ? "No bookings with that status" : "No bookings recorded"}
            description="Booking records appear here only after customers submit real requests."
            href="/dashboard/admin"
            actionLabel="Back to overview"
          />
        ) : null}

        {state === "ready" ? (
          <div className="space-y-4">
            {readOnly ? (
              <p role="status" className="text-sm text-muted-foreground">
                Booking records are read-only here. Status and payment changes are not
                available from the admin dashboard in this phase.
              </p>
            ) : null}

            {data.items.map((booking) => (
              <article
                key={booking._id}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {booking.serviceTitle || "Service not provided"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {booking.customerName || "Customer not provided"} →{" "}
                        {booking.technicianName || "Technician not provided"}
                      </p>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">Preferred date</dt>
                      <dd className="mt-1 font-medium">
                        {formatBookingDate(booking.preferredDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Booking status</dt>
                      <dd className="mt-1 font-medium">
                        <BookingStatusBadge status={booking.status} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Payment status</dt>
                      <dd className="mt-1 font-medium">
                        {bookingPaymentLabel(booking.paymentStatus)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Amount</dt>
                      <dd className="mt-1 font-medium">
                        {formatBookingAmount(booking.finalAmount ?? booking.basePrice)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <BookingDetail booking={booking} role="admin" />
              </article>
            ))}

            {!compact ? (
              <BookingPagination
                page={data.page}
                totalPages={data.totalPages}
                onPageChange={setPage}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
