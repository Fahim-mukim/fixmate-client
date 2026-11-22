"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { RefreshCw, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ButtonLink from "@/components/ui/button-link";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminPaymentErrorMessage,
  adminPaymentStatusLabel,
  adminPaymentStatusVariant,
  formatAdminPaymentAmount,
  formatAdminPaymentDate,
  formatTransactionId,
  hasAdminPaymentFilters,
  readAdminPaymentList,
} from "@/lib/admin-payment-contract.js";
import { paymentApi } from "@/lib/payment-api.js";
import {
  DEFAULT_ADMIN_PAYMENT_LIMIT,
  PAYMENT_STATUSES,
} from "@/lib/payment-contract.js";
import { paymentStatusLabel } from "@/lib/payment-ui-contract.js";
import BookingPagination from "./pagination.jsx";

const STATUS_FILTERS = Object.freeze([
  Object.freeze({ value: "", label: "All statuses" }),
  ...PAYMENT_STATUSES.map((value) =>
    Object.freeze({ value, label: paymentStatusLabel(value) }),
  ),
]);

function TransactionsSkeleton() {
  return (
    <div
      aria-label="Loading payment transactions"
      aria-busy="true"
      className="space-y-3"
    >
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="space-y-3 rounded-xl border border-border bg-surface p-4"
        >
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function TransactionField({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-6 break-words">{children}</dd>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <Badge variant={adminPaymentStatusVariant(status)}>
      {adminPaymentStatusLabel(status)}
    </Badge>
  );
}

function recordDate(row) {
  return row.createdAt ?? row.updatedAt;
}

export default function AdminTransactionsPanel() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestRef = useRef(0);

  const load = useCallback(async (targetPage, targetStatus, targetSearch) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError(null);

    const result = await paymentApi.listAdminPayments({
      page: targetPage,
      limit: DEFAULT_ADMIN_PAYMENT_LIMIT,
      status: targetStatus || undefined,
      search: targetSearch || undefined,
      sort: "newest",
    });

    if (requestId !== requestRef.current) return;

    if (!result.ok) {
      setData(null);
      setError(result);
      setLoading(false);
      return;
    }

    const normalized = readAdminPaymentList(result.data);
    if (!normalized) {
      setData(null);
      setError({
        ok: false,
        status: 502,
        code: "INVALID_PAYMENT_DATA",
        message: "The payment response could not be verified. Try again.",
      });
      setLoading(false);
      return;
    }

    const availablePage = Math.max(1, normalized.totalPages);
    if (targetPage > availablePage) {
      setPage(availablePage);
      return;
    }

    setData(normalized);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load(page, status, search));
  }, [load, page, status, search, reloadToken]);

  function handleStatusChange(value) {
    setStatus(value);
    setPage(1);
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    setSearchInput(nextSearch);
    setSearch(nextSearch);
    setPage(1);
  }

  function handleClearFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setPage(1);
  }

  function handleRefresh() {
    setReloadToken((value) => value + 1);
  }

  const filtersActive = hasAdminPaymentFilters({ status, search });
  const emptyTitle = filtersActive
    ? "No transactions match these filters"
    : "No payment records yet";

  return (
    <section aria-labelledby="admin-transactions-heading" className="space-y-6">
      <h2 id="admin-transactions-heading" className="sr-only">
        Payment transactions
      </h2>

      <form
        onSubmit={handleSearchSubmit}
        className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto] sm:items-end"
      >
        <div className="space-y-2">
          <Label htmlFor="admin-payment-status-filter">Filter by payment status</Label>
          <select
            id="admin-payment-status-filter"
            value={status}
            onChange={(event) => handleStatusChange(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value || "all"} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-payment-search">Search by service or customer</Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="admin-payment-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Service, customer, email, or technician"
              maxLength={100}
              className="h-9 w-full rounded-lg border border-input bg-background pr-2.5 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>
        </div>
        <Button type="submit" size="sm" disabled={loading}>
          Search
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          disabled={loading}
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          aria-busy={loading}
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </form>

      <div className="space-y-4">
        {loading ? <TransactionsSkeleton /> : null}

        {!loading && error ? (
          <div
            role="alert"
            className="rounded-2xl border border-danger/35 bg-danger/5 px-6 py-12 text-center"
          >
            <h3 className="text-lg font-semibold">We couldn’t load transactions</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {adminPaymentErrorMessage(error)}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {error.status === 401 ? (
                <ButtonLink href="/sign-in">Sign in</ButtonLink>
              ) : (
                <Button type="button" variant="outline" onClick={handleRefresh}>
                  Try again
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {!loading && !error && data?.items.length === 0 ? (
          <div
            role="status"
            className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center"
          >
            <h3 className="text-lg font-semibold">{emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Payment records appear here only after the Server records them.
            </p>
            {filtersActive ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-5"
                onClick={handleClearFilters}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : null}

        {!loading && !error && data?.items.length > 0 ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Total records
                </p>
                <p role="status" className="mt-1 text-xl font-semibold tabular-nums">
                  {data.total}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Completed payments
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {data.summary.paidCount}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Total revenue
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatAdminPaymentAmount(data.summary.totalRevenue)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {data.summary.currency.toUpperCase()}
                  </span>
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue and completed-payment totals cover every server-verified
              paid record, independent of the filters above.
            </p>

            <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface lg:block">
              <table
                aria-label="Admin payment transactions"
                className="w-full min-w-[1080px] text-left text-sm"
              >
                <caption className="sr-only">
                  Read-only payment records reported by the Server
                </caption>
                <thead className="bg-mist text-xs tracking-wide text-muted-foreground uppercase dark:bg-surface-alt">
                  <tr>
                    <th scope="col" className="px-4 py-3">Service</th>
                    <th scope="col" className="px-4 py-3">Customer</th>
                    <th scope="col" className="px-4 py-3">Email</th>
                    <th scope="col" className="px-4 py-3">Technician</th>
                    <th scope="col" className="px-4 py-3">Amount</th>
                    <th scope="col" className="px-4 py-3">Currency</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Transaction ID</th>
                    <th scope="col" className="px-4 py-3">Paid</th>
                    <th scope="col" className="px-4 py-3">Recorded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.items.map((row) => (
                    <tr key={row.paymentId} className="align-top">
                      <td className="px-4 py-3 font-semibold">
                        {row.serviceTitle || "Not provided"}
                      </td>
                      <td className="px-4 py-3">
                        {row.customerName || "Not provided"}
                      </td>
                      <td className="px-4 py-3 text-xs break-all text-muted-foreground">
                        {row.customerEmail || "Not provided"}
                      </td>
                      <td className="px-4 py-3">
                        {row.technicianName || "Not provided"}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatAdminPaymentAmount(row.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {row.currency || "—"}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3 text-xs break-all text-muted-foreground">
                        {formatTransactionId(row.transactionId)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {row.paidAt ? formatAdminPaymentDate(row.paidAt) : "Not paid"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatAdminPaymentDate(recordDate(row))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 lg:hidden">
              {data.items.map((row) => (
                <article
                  key={row.paymentId}
                  aria-label={`Payment transaction for ${row.serviceTitle || "an unspecified service"}`}
                  className="space-y-4 rounded-2xl border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold">
                      {row.serviceTitle || "Service not provided"}
                    </h3>
                    <StatusBadge status={row.status} />
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <TransactionField label="Customer">
                      {row.customerName || "Not provided"}
                    </TransactionField>
                    <TransactionField label="Email">
                      {row.customerEmail || "Not provided"}
                    </TransactionField>
                    <TransactionField label="Technician">
                      {row.technicianName || "Not provided"}
                    </TransactionField>
                    <TransactionField label="Amount">
                      <span className="tabular-nums">
                        {formatAdminPaymentAmount(row.amount)}
                      </span>{" "}
                      {row.currency || "—"}
                    </TransactionField>
                    <TransactionField label="Transaction ID">
                      <span className="break-all">
                        {formatTransactionId(row.transactionId)}
                      </span>
                    </TransactionField>
                    <TransactionField label="Paid">
                      {row.paidAt ? formatAdminPaymentDate(row.paidAt) : "Not paid"}
                    </TransactionField>
                    <TransactionField label="Recorded">
                      {formatAdminPaymentDate(recordDate(row))}
                    </TransactionField>
                  </dl>
                </article>
              ))}
            </div>
          </>
        ) : null}

        <BookingPagination
          label="Admin transaction pages"
          page={data?.page ?? page}
          totalPages={data?.totalPages ?? 0}
          onPageChange={setPage}
        />
      </div>

      <p
        role="status"
        className="rounded-lg border border-border bg-mist p-3 text-sm text-foreground dark:bg-surface-alt"
      >
        This view is read-only. Payment state is managed by the Server.
      </p>
    </section>
  );
}
