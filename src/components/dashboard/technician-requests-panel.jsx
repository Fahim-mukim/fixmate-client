"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.jsx";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast.jsx";
import { bookingApi } from "@/lib/booking-api.js";
import { serviceManagementApi } from "@/lib/service-management-api.js";
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
import { DashboardBarChart } from "./dashboard-chart.jsx";
import BookingPagination from "./pagination.jsx";
import BookingStatusBadge from "./booking-status-badge.jsx";
import { StatCard, StatCardSkeleton, StatsGrid } from "./stat-card.jsx";

const TECHNICIAN_CHART_CONFIG = Object.freeze({
  value: { label: "Count", color: "var(--chart-2)" },
});

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
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
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

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError("");
    const [bookingStats, serviceStats] = await Promise.all([
      bookingApi.getTechnicianBookingStats(),
      serviceManagementApi.getMyServiceStats(),
    ]);

    if (bookingStats.ok && serviceStats.ok) {
      setStats({
        totalServices: serviceStats.data.totalServices,
        approvedServices: serviceStats.data.approvedServices,
        pendingRequests: bookingStats.data.pendingRequests,
      });
    } else {
      setStats(null);
      const failed = !bookingStats.ok ? bookingStats : serviceStats;
      setStatsError(
        bookingErrorMessage(failed, "Unable to load technician statistics."),
      );
    }
    setStatsLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  useEffect(() => {
    void Promise.resolve().then(() => loadStats());
  }, [loadStats]);

  const refreshAll = useCallback(() => {
    void load();
    void loadStats();
  }, [load, loadStats]);

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
      const statusLabel = result.data?.status ?? action;
      setActionMessage(`Booking updated to ${statusLabel}.`);
      setDetails((current) => ({ ...current, [id]: result.data }));
      toast.add({
        type: "success",
        title: "Booking updated",
        description: `${ACTION_LABELS[action] ?? "Booking action"} completed successfully.`,
      });
      await load();
      void loadStats();
    } else {
      setActionError(result);
      toast.add({
        type: "error",
        title: "Booking update failed",
        description: bookingErrorMessage(result, "Unable to update this booking."),
      });
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
  const statsChartData = stats
    ? [
        { name: "Total services", value: stats.totalServices },
        { name: "Approved services", value: stats.approvedServices },
        { name: "Pending requests", value: stats.pendingRequests },
      ]
    : [];

  return (
    <section aria-labelledby="technician-requests-heading" className="space-y-6">
      {statsLoading ? (
        <StatsGrid label="Technician dashboard statistics">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </StatsGrid>
      ) : statsError ? (
        <div
          role="alert"
          className="rounded-xl border border-danger/35 bg-danger/5 p-4 text-sm text-destructive"
        >
          <p>{statsError}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void loadStats()}>
            Retry statistics
          </Button>
        </div>
      ) : stats ? (
        <div className="space-y-4">
          <StatsGrid label="Technician dashboard statistics">
            <StatCard label="Total Services" value={stats.totalServices} note="Services you own" />
            <StatCard label="Approved Services" value={stats.approvedServices} note="Approved and visible when available" />
            <StatCard label="Pending Requests" value={stats.pendingRequests} note="Assigned bookings awaiting your response" />
          </StatsGrid>
          <DashboardBarChart
            title="Technician overview"
            description="Your service and pending request counts from the server."
            data={statsChartData}
            config={TECHNICIAN_CHART_CONFIG}
            emptyMessage="No technician statistics yet. Your chart will appear as your services and requests grow."
          />
        </div>
      ) : null}

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
            onClick={refreshAll}
            disabled={loading || statsLoading}
          >
            Refresh requests
          </Button>
        </div>
      ) : (
        <BookingFilters
          status={statusFilter}
          onStatusChange={handleStatusChange}
          onRefresh={refreshAll}
          refreshing={loading || statsLoading}
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

                        <AlertDialog
                          open={rejectingId === booking._id}
                          onOpenChange={(open) => {
                            if (busyId === booking._id) return;
                            setRejectingId(open ? booking._id : "");
                          }}
                        >
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reject this request?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will reject the request for{" "}
                                <span className="font-medium text-foreground">
                                  {booking.serviceTitle || "this service"}
                                </span>
                                . Rejection is final and releases the customer’s active slot.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={busyId === booking._id}>
                                Keep request
                              </AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                disabled={busyId === booking._id}
                                onClick={(event) => {
                                  event.preventDefault();
                                  void runAction(booking._id, "reject");
                                }}
                              >
                                {busyId === booking._id ? "Rejecting…" : "Yes, reject"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

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
