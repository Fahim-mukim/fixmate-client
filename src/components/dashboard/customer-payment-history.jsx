"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ButtonLink from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";
import {
  customerPaymentErrorMessage,
  customerPaymentStatusLabel,
  customerPaymentStatusVariant,
  formatCustomerPaymentAmount,
  formatCustomerPaymentDate,
  formatTransactionId,
  readCustomerPaymentHistoryList,
} from "@/lib/customer-payment-history-contract.js";
import { CUSTOMER_BOOKINGS_PATH } from "@/lib/payment-ui-contract.js";
import { paymentApi } from "@/lib/payment-api.js";
import { DEFAULT_CUSTOMER_HISTORY_LIMIT } from "@/lib/payment-contract.js";
import BookingPagination from "./pagination.jsx";

function HistorySkeleton() {
  return (
    <div
      aria-label="Loading payment history"
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

function HistoryField({ label, children }) {
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
    <Badge variant={customerPaymentStatusVariant(status)}>
      {customerPaymentStatusLabel(status)}
    </Badge>
  );
}

export default function CustomerPaymentHistory() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestRef = useRef(0);

  const load = useCallback(async (targetPage) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError(null);

    const result = await paymentApi.listCustomerPaymentHistory({
      page: targetPage,
      limit: DEFAULT_CUSTOMER_HISTORY_LIMIT,
    });

    if (requestId !== requestRef.current) return;

    if (!result.ok) {
      setData(null);
      setError(result);
      setLoading(false);
      return;
    }

    const normalized = readCustomerPaymentHistoryList(result.data);
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
    void Promise.resolve().then(() => load(page));
  }, [load, page, reloadToken]);

  function handleRefresh() {
    setReloadToken((value) => value + 1);
  }

  return (
    <section aria-labelledby="customer-history-heading" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div>
          <h2 id="customer-history-heading" className="text-lg font-semibold">
            Payment history
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Server-confirmed records for payments you have started.
          </p>
        </div>
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
      </div>

      {loading ? <HistorySkeleton /> : null}

      {!loading && error ? (
        <div
          role="alert"
          className="rounded-2xl border border-danger/35 bg-danger/5 px-6 py-12 text-center"
        >
          <h3 className="text-lg font-semibold">We couldn’t load your payments</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {customerPaymentErrorMessage(error)}
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
          <h3 className="text-lg font-semibold">No payments yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Pay Now appears on a completed, unpaid booking. Your payment records
            will appear here once Checkout is started.
          </p>
          <ButtonLink
            href={CUSTOMER_BOOKINGS_PATH}
            variant="outline"
            className="mt-5"
          >
            View my bookings
          </ButtonLink>
        </div>
      ) : null}

      {!loading && !error && data?.items.length > 0 ? (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            Total records: {data.total}
          </p>

          <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface lg:block">
            <table
              aria-label="Customer payment history"
              className="w-full min-w-[880px] text-left text-sm"
            >
              <caption className="sr-only">
                Read-only payment records reported by the Server
              </caption>
              <thead className="bg-mist text-xs tracking-wide text-muted-foreground uppercase dark:bg-surface-alt">
                <tr>
                  <th scope="col" className="px-4 py-3">Service</th>
                  <th scope="col" className="px-4 py-3">Technician</th>
                  <th scope="col" className="px-4 py-3">Amount</th>
                  <th scope="col" className="px-4 py-3">Currency</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Transaction ID</th>
                  <th scope="col" className="px-4 py-3">Payment date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((row) => (
                  <tr key={row.paymentId} className="align-top">
                    <td className="px-4 py-3 font-semibold">
                      {row.serviceTitle || "Not provided"}
                    </td>
                    <td className="px-4 py-3">
                      {row.technicianName || "Not provided"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCustomerPaymentAmount(row.amount)}
                    </td>
                    <td className="px-4 py-3">{row.currency || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 text-xs break-all text-muted-foreground">
                      {formatTransactionId(row.transactionId)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatCustomerPaymentDate(row.paidAt ?? row.createdAt)}
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
                aria-label={`Payment for ${row.serviceTitle || "an unspecified service"}`}
                className="space-y-4 rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold">
                    {row.serviceTitle || "Service not provided"}
                  </h3>
                  <StatusBadge status={row.status} />
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <HistoryField label="Technician">
                    {row.technicianName || "Not provided"}
                  </HistoryField>
                  <HistoryField label="Amount">
                    <span className="tabular-nums">
                      {formatCustomerPaymentAmount(row.amount)}
                    </span>{" "}
                    {row.currency || "—"}
                  </HistoryField>
                  <HistoryField label="Transaction ID">
                    <span className="break-all">
                      {formatTransactionId(row.transactionId)}
                    </span>
                  </HistoryField>
                  <HistoryField label="Payment date">
                    {formatCustomerPaymentDate(row.paidAt ?? row.createdAt)}
                  </HistoryField>
                </dl>
              </article>
            ))}
          </div>
        </>
      ) : null}

      <BookingPagination
        label="Customer payment history pages"
        page={data?.page ?? page}
        totalPages={data?.totalPages ?? 0}
        onPageChange={setPage}
      />

      <p
        role="status"
        className="rounded-lg border border-border bg-mist p-3 text-sm text-foreground dark:bg-surface-alt"
      >
        This view is read-only. Payment status is managed by the Server.
      </p>
    </section>
  );
}
