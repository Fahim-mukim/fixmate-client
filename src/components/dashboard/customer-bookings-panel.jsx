"use client";

import { useCallback, useEffect, useState } from "react";

import ButtonLink from "@/components/ui/button-link";
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
import { toast } from "@/components/ui/toast.jsx";
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
import CustomerPayNowButton from "./customer-pay-now-button.jsx";
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

const CUSTOMER_CHART_CONFIG = Object.freeze({
  value: { label: "Bookings", color: "var(--chart-1)" },
});

export default function CustomerBookingsPanel({ compact = false }) {
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

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError("");
    const result = await bookingApi.getMyBookingStats();
    if (result.ok) {
      setStats(result.data);
    } else {
      setStats(null);
      setStatsError(bookingErrorMessage(result, "Unable to load booking statistics."));
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
      toast.add({
        type: "success",
        title: "Booking cancelled",
        description: "The booking request was cancelled.",
      });
      await load();
      void loadStats();
    } else {
      setActionError(result);
      toast.add({
        type: "error",
        title: "Cancellation failed",
        description: bookingErrorMessage(result, "Unable to cancel this booking."),
      });
    }
    setBusyId("");
  }

  function handleStatusChange(value) {
    setStatusFilter(value);
    setPage(1);
    setDetails({});
  }

  const state = bookingViewState({ loading, error, items: data?.items });
  const statsChartData = stats
    ? [
        { name: "Total requests", value: stats.totalRequests },
        { name: "Active jobs", value: stats.activeJobs },
        { name: "Completed", value: stats.completedJobs },
      ]
    : [];

  return (
    <section aria-labelledby="customer-bookings-heading" className="space-y-6">
      {statsLoading ? (
        <StatsGrid label="Customer booking statistics">
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
          <StatsGrid label="Customer booking statistics">
            <StatCard label="Total Requests" value={stats.totalRequests} note="All your booking requests" />
            <StatCard label="Active Jobs" value={stats.activeJobs} note="Requested, accepted, or in progress" />
            <StatCard label="Completed Jobs" value={stats.completedJobs} note="Completed requests" />
          </StatsGrid>
          <DashboardBarChart
            title="Booking overview"
            description="Your booking counts by status group."
            data={statsChartData}
            config={CUSTOMER_CHART_CONFIG}
            emptyMessage="No booking requests yet. Your chart will appear after you create a request."
          />
        </div>
      ) : null}

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
          onRefresh={refreshAll}
          refreshing={loading || statsLoading}
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

                <CustomerPayNowButton booking={booking} role="customer" />

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
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">
                          Not needed anymore? You can cancel while it is requested.
                        </p>
                        <AlertDialog
                          open={confirmingId === booking._id}
                          onOpenChange={(open) => {
                            if (busyId === booking._id) return;
                            setConfirmingId(open ? booking._id : "");
                          }}
                        >
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setConfirmingId(booking._id)}
                          >
                            Cancel request
                          </Button>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel this booking request?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will cancel your request for{" "}
                                <span className="font-medium text-foreground">
                                  {booking.serviceTitle || "this service"}
                                </span>
                                . This cannot be undone. You can request the service again later.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel
                                disabled={busyId === booking._id}
                                onClick={() => setConfirmingId("")}
                              >
                                Keep booking
                              </AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                disabled={busyId === booking._id}
                                onClick={(event) => {
                                  event.preventDefault();
                                  void handleCancel(booking._id);
                                }}
                              >
                                {busyId === booking._id ? "Cancelling…" : "Yes, cancel request"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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
