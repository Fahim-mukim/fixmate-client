import { Search } from "lucide-react";
import Link from "next/link";

import ButtonLink from "@/components/ui/button-link";
import {
  SERVICE_CATEGORIES,
  SERVICE_MODES,
  SORT_OPTIONS,
} from "@/lib/service-utils";

const inputClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";
const labelClass = "mb-1.5 block text-sm font-medium";
const standardLimits = [12, 24, 50];

export default function ServiceFilters({ params = {} }) {
  const currentLimit = Number(params.limit ?? 12);
  const limitOptions = standardLimits.includes(currentLimit)
    ? standardLimits
    : [currentLimit, ...standardLimits].sort((a, b) => a - b);

  return (
    <form
      action="/services"
      method="get"
      aria-label="Filter services"
      className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2 xl:col-span-2">
          <label htmlFor="service-search" className={labelClass}>
            Search services
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="service-search"
              name="search"
              type="search"
              maxLength={100}
              defaultValue={params.search ?? ""}
              placeholder="Search by title, category, technician, or area"
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="service-category" className={labelClass}>
            Category
          </label>
          <select
            id="service-category"
            name="category"
            defaultValue={params.category ?? ""}
            className={inputClass}
          >
            <option value="">All categories</option>
            {SERVICE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="service-mode" className={labelClass}>
            Service mode
          </label>
          <select
            id="service-mode"
            name="serviceMode"
            defaultValue={params.serviceMode ?? ""}
            className={inputClass}
          >
            <option value="">Any service mode</option>
            {SERVICE_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="min-price" className={labelClass}>
            Minimum price
          </label>
          <input
            id="min-price"
            name="minPrice"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={params.minPrice ?? ""}
            placeholder="0.00"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="max-price" className={labelClass}>
            Maximum price
          </label>
          <input
            id="max-price"
            name="maxPrice"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={params.maxPrice ?? ""}
            placeholder="Any"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="service-sort" className={labelClass}>
            Sort by
          </label>
          <select
            id="service-sort"
            name="sort"
            defaultValue={params.sort ?? "newest"}
            className={inputClass}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="service-limit" className={labelClass}>
            Results per page
          </label>
          <select
            id="service-limit"
            name="limit"
            defaultValue={String(currentLimit)}
            className={inputClass}
          >
            {limitOptions.map((limit) => (
              <option key={limit} value={limit}>
                {limit}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/services"
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Clear all filters
        </Link>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-teal px-5 text-sm font-semibold text-navy transition-colors hover:bg-teal-strong focus-visible:ring-3 focus-visible:ring-teal/50"
        >
          Apply filters
        </button>
      </div>
    </form>
  );
}

export function ServicesFilterFallback() {
  return (
    <div
      aria-label="Loading service filters"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <div className="h-64 animate-pulse rounded-xl bg-mist dark:bg-surface-alt" />
    </div>
  );
}

export function FiltersCallout() {
  return (
    <ButtonLink href="/services" variant="link" size="sm" className="px-0">
      Reset to all services
    </ButtonLink>
  );
}
