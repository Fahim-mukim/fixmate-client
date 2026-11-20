import Link from "next/link";

import ServiceCard from "@/components/services/service-card";
import ServiceFilters from "@/components/services/service-filters";
import {
  EmptyState,
  ErrorState,
  Notice,
  serviceErrorCopy,
} from "@/components/services/service-states";
import { getPublicServices } from "@/lib/service-api";
import {
  buildPageHref,
  parseListingParams,
} from "@/lib/service-utils";
import { cn } from "cn";

function getPageNumbers(current, total) {
  const candidates = new Set([1, total, current - 1, current, current + 1]);
  return [...candidates]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
}

function Pagination({ params, page, totalPages }) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <nav
      aria-label="Service result pages"
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link
          href={buildPageHref(params, page - 1)}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-mist dark:hover:bg-surface-alt"
        >
          Previous
        </Link>
      ) : null}

      {pages.map((value, index) => (
        <span key={value} className="flex items-center gap-2">
          {index > 0 && value - pages[index - 1] > 1 ? (
            <span aria-hidden="true" className="px-1 text-muted-foreground">
              …
            </span>
          ) : null}
          <Link
            href={buildPageHref(params, value)}
            aria-current={value === page ? "page" : undefined}
            className={cn(
              "min-w-9 rounded-lg border border-border px-3 py-2 text-center text-sm font-medium hover:bg-mist dark:hover:bg-surface-alt",
              value === page && "border-teal bg-teal text-navy hover:bg-teal"
            )}
          >
            {value}
          </Link>
        </span>
      ))}

      {page < totalPages ? (
        <Link
          href={buildPageHref(params, page + 1)}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-mist dark:hover:bg-surface-alt"
        >
          Next
        </Link>
      ) : null}
    </nav>
  );
}

export default async function ServicesContent({ searchParams }) {
  const raw = await searchParams;
  const { params, ignored } = parseListingParams(raw);
  const result = await getPublicServices(params);

  return (
    <div className="space-y-6">
      {ignored.length > 0 ? (
        <Notice>
          Some filter values were invalid and were ignored: {ignored.join(", ")}.
        </Notice>
      ) : null}

      <ServiceFilters key={JSON.stringify(params)} params={params} />

      {!result.ok ? (
        <ErrorState
          title={serviceErrorCopy(result.reason).title}
          description={serviceErrorCopy(result.reason).description}
          href="/services"
          actionLabel="Reload services"
        />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          description="No approved, available services match these filters. Try clearing a filter or searching with a different term."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <p aria-live="polite">
              {result.data.total} approved service
              {result.data.total === 1 ? "" : "s"} found
            </p>
            <p>
              Page {result.data.page} of {result.data.totalPages}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {result.data.items.map((service, index) => {
              const rawId = service?._id;
              const key =
                typeof rawId === "string" && rawId
                  ? rawId
                  : `${result.data.page}-${index}`;

              return <ServiceCard key={key} service={service} />;
            })}
          </div>

          <Pagination
            params={params}
            page={result.data.page}
            totalPages={result.data.totalPages}
          />
        </>
      )}
    </div>
  );
}
