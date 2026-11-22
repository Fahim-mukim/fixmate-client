"use client";

import { useCallback, useEffect, useState } from "react";

import ButtonLink from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";
import { bookingApi } from "@/lib/booking-api.js";
import {
  DEFAULT_BOOKING_LIMIT,
  bookingErrorMessage,
  bookingViewState,
  canCustomerCancel,
  formatBookingAmount,
  formatBookingDate,
} from "@/lib/booking-contract.js";
import BookingDetail from "./booking-detail.jsx";
import BookingFilters from "./booking-filters.jsx";
import {
  BookingEmpty,
  BookingError,
  BookingInlineNotice,
  BookingLoading,
} from "./booking-state.jsx";
import BookingPagination from "./pagination.jsx";
import BookingStatusBadge from "./booking-status-badge.jsx";
import BookingSummary from "./booking-summary.jsx";

export default function CustomerBookingsPanel({ compact = false }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState({});
  const [detailLoading, setDetailLoading] = useState({});
  const [detailErrors, setDetailErrors] = useState({});
  const [confirmingId, setConfirmingId] = useState("");
  const [busyId, setBusyId] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState(null);

  const limit = compact ? 5 : DEFAULT_BOOKING_LIMIT;

  const load = useCallback(
    async (nextPage = page, nextStatus = statusFilter) => {
      setLoading(true);
      setError(null);
      const result = await bookingApi.listMyBookings({
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

  async function handleOpenDetail(id) {
    if (details[id]) return;
    setDetailLoading((current) => ({ ...current, [id]: true }));
    setDetailErrors((current) => ({ ...current, [id]: "" }));
    const result = await bookingApi.getBooking(id);
    if (result.ok) {
      setDetails((current) => ({ ...current, [id]: result.data }));
    } else {
      setDetailErrors((current) => ({
        ...current,
        [id]: bookingErrorMessage(result, "Unable to load this booking."),
      }));
    }
    setDetailLoading((current) => ({ ...current, [id]: false }));
  }

  async function handleCancel(id) {
    setBusyId(id);
    setActionError(null);
    setActionMessage("");
    const result = await bookingApi.cancelBooking(id);

    if (result.ok) {
      setConfirmingId("");
      setActionMessage("The request was cancelled.");
      await load();
    } else {
      setActionError(result);
    }
    setBusyId("");
  }

  function handleStatusChange(value) {
    setStatusFilter(value);
    setPage(1);
    setDetails({});
  }

  const state = bookingViewState({ loading, error, items: data?.items });

  return (
    <section aria-labelledby="customer-bookings-heading" className="space-y-6">
      <BookingSummary
        items={data?.items}
        total={data?.total}
        note={compact ? "Most recent bookings" : "On this page"}
      />

      {actionMessage ? (
        <BookingInlineNotice>{actionMessage}</BookingInlineNotice>
      ) : null}
      {actionError ? (
        <div role="alert" className="rounded-lg border border-danger/35 bg-danger/5 p-3 text-sm text-destructive">
          {bookingErrorMessage(actionError, "Unable to cancel this booking.")}
        </div>
      ) : null}

      {compact ? (
        <div className="flex justify-end">
          <ButtonLink href="/dashboard/customer/bookings" variant="outline" size="sm">
            View all bookings
          </ButtonLink>
        </div>
      ) : (
        <BookingFilters
          status={statusFilter}
          onStatusChange={handleStatusChange}
          onRefresh={() => load()}
          refreshing={loading}
        />
      )}

      <div>
        <h2 id="customer-bookings-heading" className="sr-only">
          {compact ? "Recent booking requests" : "My booking requests"}
        </h2>

        {state === "loading" ? <BookingLoading /> : null}

        {state === "error" ? (
          <BookingError result={error} onRetry={() => load()} />
        ) : null}

        {state === "empty" ? (
          <BookingEmpty
            title={statusFilter ? "No bookings with that status" : "No booking requests yet"}
            description={
              statusFilter
                ? "Try another status or refresh the list."
                : "Browse approved services and send your first repair request."
            }
            href={statusFilter ? "/dashboard/customer/bookings" : "/services"}
            actionLabel={statusFilter ? "Clear filter" : "Browse services"}
          />
        ) : null}

        {state === "ready" ? (
          <div className="space-y-4">
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
                        {booking.technicianName || "Technician not provided"}
                      </p>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">Preferred date</dt>
                      <dd className="mt-1 font-medium">
                        {formatBookingDate(booking.preferredDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Base price</dt>
                      <dd className="mt-1 font-medium">
                        {formatBookingAmount(booking.basePrice)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Payment</dt>
                      <dd className="mt-1 font-medium">
                        {booking.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-3 text-sm leading-6 text-muted-foreground line-clamp-2">
                    {booking.problemDescription}
                  </p>
                </div>

                <BookingDetail
                  booking={booking}
                  role="customer"
                  detail={details[booking._id]}
                  detailLoading={Boolean(detailLoading[booking._id])}
                  onOpen={handleOpenDetail}
                >
                  {detailErrors[booking._id] ? (
                    <BookingInlineNotice tone="error">
                      {detailErrors[booking._id]}
                    </BookingInlineNotice>
                  ) : null}

                  {canCustomerCancel(booking) ? (
                    <div className="mt-4 rounded-lg border border-border bg-mist p-3 dark:bg-surface-alt">
                      {confirmingId !== booking._id ? (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm text-muted-foreground">
                            Not needed anymore? You can cancel while it is requested.
                          </p>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setConfirmingId(booking._id)}
                          >
                            Cancel request
                          </Button>
                        </div>
                      ) : (
                        <div
                          role="alertdialog"
                          aria-labelledby={`cancel-title-${booking._id}`}
                          className="space-y-3"
                        >
                          <p id={`cancel-title-${booking._id}`} className="text-sm font-semibold">
                            Cancel this booking request?
                          </p>
                          <p className="text-sm text-muted-foreground">
                            This cannot be undone. You can request the service again later.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancel(booking._id)}
                              disabled={busyId === booking._id}
                              aria-busy={busyId === booking._id}
                            >
                              {busyId === booking._id ? "Cancelling…" : "Yes, cancel request"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmingId("")}
                              disabled={busyId === booking._id}
                            >
                              Keep booking
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </BookingDetail>
              </article>
            ))}

            {!compact ? (
              <BookingPagination
                page={data.page}
                totalPages={data.totalPages}
                onPageChange={(nextPage) => {
                  setPage(nextPage);
                  setDetails({});
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
