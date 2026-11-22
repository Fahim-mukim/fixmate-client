"use client";

import { useCallback, useEffect, useState } from "react";

import ServiceImage from "@/components/services/service-image.jsx";
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
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const limit = compact ? 5 : DEFAULT_BOOKING_LIMIT;

  useEffect(() => {
    const timer = setTimeout(() => {
      const normalized = searchInput.trim();
      setSearch((current) => (current === normalized ? current : normalized));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(
    async ({
      nextPage = page,
      nextStatus = statusFilter,
      nextPaymentStatus = paymentStatusFilter,
      nextSearch = search,
    } = {}) => {
      setLoading(true);
      setError(null);
      const result = await bookingApi.listAdminBookings({
        page: nextPage,
        status: nextStatus || undefined,
        paymentStatus: nextPaymentStatus || undefined,
        search: nextSearch || undefined,
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
    [limit, page, paymentStatusFilter, search, statusFilter],
  );

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  function handleStatusChange(value) {
    setStatusFilter(value);
    setPage(1);
  }

  function handlePaymentStatusChange(value) {
    setPaymentStatusFilter(value);
    setPage(1);
  }

  const state = bookingViewState({ loading, error, items: data?.items });
  const readOnly = getAdminActions().length === 0;
  const hasFilters = Boolean(statusFilter || paymentStatusFilter || search);

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
          paymentStatus={paymentStatusFilter}
          onPaymentStatusChange={handlePaymentStatusChange}
          search={searchInput}
          onSearchChange={setSearchInput}
          showPaymentStatus
          showSearch
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
            title={hasFilters ? "No bookings match these filters" : "No bookings recorded"}
            description={
              hasFilters
                ? "Try clearing a filter or searching for a different service, customer, or technician."
                : "Booking records appear here only after customers submit real requests."
            }
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

            <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface md:block">
              <table className="min-w-full text-left text-sm">
                <caption className="sr-only">Admin booking overview table</caption>
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Service</th>
                    <th scope="col" className="px-4 py-3 font-medium">Customer</th>
                    <th scope="col" className="px-4 py-3 font-medium">Technician</th>
                    <th scope="col" className="px-4 py-3 font-medium">Booking status</th>
                    <th scope="col" className="px-4 py-3 font-medium">Payment</th>
                    <th scope="col" className="px-4 py-3 font-medium">Preferred date</th>
                    <th scope="col" className="px-4 py-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items.map((booking) => (
                    <tr key={booking._id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="flex min-w-56 items-start gap-3">
                          <ServiceImage
                            src={booking.serviceImage}
                            alt={booking.serviceTitle || "Service"}
                            className="size-12 shrink-0 rounded-lg"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">
                              {booking.serviceTitle || "Service not provided"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {booking.serviceCategory || "Category not provided"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{booking.customerName || "Customer not provided"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{booking.customerEmail || "Email not provided"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{booking.technicianName || "Technician not provided"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{booking.technicianEmail || "Email not provided"}</p>
                      </td>
                      <td className="px-4 py-3"><BookingStatusBadge status={booking.status} /></td>
                      <td className="px-4 py-3">{bookingPaymentLabel(booking.paymentStatus)}</td>
                      <td className="px-4 py-3">{formatBookingDate(booking.preferredDate)}</td>
                      <td className="px-4 py-3 font-medium">{formatBookingAmount(booking.finalAmount ?? booking.basePrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 md:hidden">
              {data.items.map((booking) => (
                <article
                  key={booking._id}
                  className="overflow-hidden rounded-xl border border-border bg-surface"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <ServiceImage
                          src={booking.serviceImage}
                          alt={booking.serviceTitle || "Service"}
                          className="size-14 shrink-0 rounded-lg"
                        />
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold">
                            {booking.serviceTitle || "Service not provided"}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {booking.customerName || "Customer not provided"} ·{" "}
                            {booking.technicianName || "Technician not provided"}
                          </p>
                        </div>
                      </div>
                      <BookingStatusBadge status={booking.status} />
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-muted-foreground">Preferred date</dt>
                        <dd className="mt-1 font-medium">{formatBookingDate(booking.preferredDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Payment status</dt>
                        <dd className="mt-1 font-medium">{bookingPaymentLabel(booking.paymentStatus)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Amount</dt>
                        <dd className="mt-1 font-medium">{formatBookingAmount(booking.finalAmount ?? booking.basePrice)}</dd>
                      </div>
                    </dl>
                  </div>

                  <BookingDetail booking={booking} role="admin" />
                </article>
              ))}
            </div>

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
