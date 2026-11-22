"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bookingApi } from "@/lib/booking-api.js";
import {
  DEFAULT_BOOKING_LIMIT,
  bookingErrorMessage,
  bookingViewState,
  formatBookingAmount,
  formatBookingDate,
  getTechnicianActions,
  parsePositiveAmount,
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

const ACTION_LABELS = Object.freeze({
  accept: "Accept request",
  reject: "Reject request",
  start: "Start work",
  complete: "Complete job",
});

export default function TechnicianRequestsPanel({ compact = false }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState({});
  const [detailLoading, setDetailLoading] = useState({});
  const [detailErrors, setDetailErrors] = useState({});
  const [amounts, setAmounts] = useState({});
  const [amountErrors, setAmountErrors] = useState({});
  const [rejectingId, setRejectingId] = useState("");
  const [busyId, setBusyId] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState(null);

  const limit = compact ? 5 : DEFAULT_BOOKING_LIMIT;

  const load = useCallback(
    async (nextPage = page, nextStatus = statusFilter) => {
      setLoading(true);
      setError(null);
      const result = await bookingApi.listTechnicianBookings({
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
    const result = await bookingApi.getTechnicianBooking(id);
    if (result.ok) {
      setDetails((current) => ({ ...current, [id]: result.data }));
    } else {
      setDetailErrors((current) => ({
        ...current,
        [id]: bookingErrorMessage(result, "Unable to load this request."),
      }));
    }
    setDetailLoading((current) => ({ ...current, [id]: false }));
  }

  async function runAction(id, action, finalAmount) {
    setBusyId(id);
    setActionMessage("");
    setActionError(null);

    const result = await bookingApi.updateBookingStatus(id, action, finalAmount);
    if (result.ok) {
      setRejectingId("");
      setAmounts((current) => ({ ...current, [id]: "" }));
      setActionMessage(`Booking updated to ${result.data?.status ?? action}.`);
      setDetails((current) => ({ ...current, [id]: result.data }));
      await load();
    } else {
      setActionError(result);
    }
    setBusyId("");
  }

  function handleActionClick(id, action) {
    if (action === "reject") {
      setRejectingId(id);
      return;
    }
    runAction(id, action);
  }

  function handleComplete(id) {
    const amount = parsePositiveAmount(amounts[id]);
    if (amount === null) {
      setAmountErrors((current) => ({
        ...current,
        [id]: "Enter a valid positive final amount.",
      }));
      return;
    }
    setAmountErrors((current) => ({ ...current, [id]: "" }));
    runAction(id, "complete", amount);
  }

  function handleStatusChange(value) {
    setStatusFilter(value);
    setPage(1);
    setDetails({});
  }

  const state = bookingViewState({ loading, error, items: data?.items });

  return (
    <section aria-labelledby="technician-requests-heading" className="space-y-6">
      <BookingSummary
        items={data?.items}
        total={data?.total}
        note={compact ? "Most recent requests" : "On this page"}
      />

      {actionMessage ? (
        <BookingInlineNotice>{actionMessage}</BookingInlineNotice>
      ) : null}
      {actionError ? (
        <div role="alert" className="rounded-lg border border-danger/35 bg-danger/5 p-3 text-sm text-destructive">
          {bookingErrorMessage(actionError, "Unable to update this booking.")}
        </div>
      ) : null}

      {compact ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => load()}
            disabled={loading}
          >
            Refresh requests
          </Button>
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
        <h2 id="technician-requests-heading" className="sr-only">
          {compact ? "Recent booking requests" : "Incoming booking requests"}
        </h2>

        {state === "loading" ? <BookingLoading label="Loading requests" /> : null}

        {state === "error" ? (
          <BookingError
            result={error}
            onRetry={() => load()}
            title="We couldn’t load your requests"
          />
        ) : null}

        {state === "empty" ? (
          <BookingEmpty
            title={statusFilter ? "No requests with that status" : "No incoming requests"}
            description={
              statusFilter
                ? "Try another status or refresh the list."
                : "New requests for your approved, available services will appear here."
            }
            href="/dashboard/technician"
            actionLabel="Back to overview"
          />
        ) : null}

        {state === "ready" ? (
          <div className="space-y-4">
            {data.items.map((booking) => {
              const current = details[booking._id] ?? booking;
              const actions = getTechnicianActions(current.status);

              return (
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
                          {booking.customerName || "Customer not provided"}
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
                        <dt className="text-xs text-muted-foreground">Phone</dt>
                        <dd className="mt-1 font-medium">
                          {booking.customerPhone || "Not provided"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Base price</dt>
                        <dd className="mt-1 font-medium">
                          {formatBookingAmount(booking.basePrice)}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-3 text-sm leading-6 text-muted-foreground line-clamp-2">
                      {booking.problemDescription}
                    </p>
                  </div>

                  <BookingDetail
                    booking={booking}
                    role="technician"
                    detail={details[booking._id]}
                    detailLoading={Boolean(detailLoading[booking._id])}
                    onOpen={handleOpenDetail}
                  >
                    {detailErrors[booking._id] ? (
                      <BookingInlineNotice tone="error">
                        {detailErrors[booking._id]}
                      </BookingInlineNotice>
                    ) : null}

                    {actions.length > 0 ? (
                      <div className="mt-4 space-y-3 rounded-lg border border-border bg-mist p-3 dark:bg-surface-alt">
                        <p className="text-sm font-medium">
                          Available next steps for this status
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {actions.map((action) => {
                            if (action === "complete") return null;
                            return (
                              <Button
                                key={action}
                                type="button"
                                size="sm"
                                variant={action === "reject" ? "destructive" : "default"}
                                onClick={() => handleActionClick(booking._id, action)}
                                disabled={busyId === booking._id}
                              >
                                {ACTION_LABELS[action]}
                              </Button>
                            );
                          })}
                        </div>

                        {rejectingId === booking._id ? (
                          <div
                            role="alertdialog"
                            aria-labelledby={`reject-title-${booking._id}`}
                            className="space-y-2 rounded-lg border border-danger/30 bg-danger/5 p-3"
                          >
                            <p id={`reject-title-${booking._id}`} className="text-sm font-semibold">
                              Reject this request?
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Rejection is final and releases the customer’s active slot.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => runAction(booking._id, "reject")}
                                disabled={busyId === booking._id}
                              >
                                Yes, reject
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setRejectingId("")}
                                disabled={busyId === booking._id}
                              >
                                Keep request
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        {actions.includes("complete") ? (
                          <div className="space-y-2">
                            <Label htmlFor={`final-amount-${booking._id}`}>
                              Final amount
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              <Input
                                id={`final-amount-${booking._id}`}
                                type="number"
                                min="0.01"
                                step="0.01"
                                inputMode="decimal"
                                className="max-w-40"
                                value={amounts[booking._id] ?? ""}
                                onChange={(event) => {
                                  setAmounts((current) => ({
                                    ...current,
                                    [booking._id]: event.target.value,
                                  }));
                                  setAmountErrors((current) => ({
                                    ...current,
                                    [booking._id]: "",
                                  }));
                                }}
                                disabled={busyId === booking._id}
                                aria-invalid={Boolean(amountErrors[booking._id])}
                                aria-describedby={
                                  amountErrors[booking._id]
                                    ? `final-amount-error-${booking._id}`
                                    : undefined
                                }
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleComplete(booking._id)}
                                disabled={busyId === booking._id}
                              >
                                Complete job
                              </Button>
                            </div>
                            {amountErrors[booking._id] ? (
                              <p
                                id={`final-amount-error-${booking._id}`}
                                role="alert"
                                className="text-xs text-destructive"
                              >
                                {amountErrors[booking._id]}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                A positive amount is required and is stored by the server.
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </BookingDetail>
                </article>
              );
            })}

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
