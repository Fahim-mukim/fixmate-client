import { ArrowRight, Clock3, MapPin } from "lucide-react";
import Link from "next/link";

import ServiceImage from "@/components/services/service-image";
import { formatPrice } from "@/lib/service-utils";

function textOrFallback(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export default function ServiceCard({ service }) {
  const rawId = service?._id;
  const id = textOrFallback(rawId, "");
  const title = textOrFallback(service?.title, "Untitled service");
  const category = textOrFallback(service?.category, "Uncategorized");
  const technician = textOrFallback(service?.technicianName, "Technician not provided");
  const serviceMode = textOrFallback(service?.serviceMode, "Service mode not provided");
  const area = textOrFallback(service?.serviceArea, "Service area not provided");
  const duration = textOrFallback(
    service?.estimatedDuration,
    "Duration not provided"
  );

  return (
    <article className="group h-full rounded-2xl border border-border bg-surface transition-shadow hover:shadow-lg focus-within:shadow-lg">
      <Link
        href={id ? `/services/${encodeURIComponent(id)}` : "/services"}
        aria-label={`View details for ${title}`}
        className="flex h-full flex-col rounded-2xl focus-visible:rounded-2xl"
      >
        <div className="overflow-hidden rounded-t-2xl">
          <ServiceImage
            src={service?.image}
            alt={`${title} repair service`}
            className="aspect-4/3 w-full transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>

        <div className="flex flex-1 flex-col gap-4 p-5">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-mist px-2.5 py-1 text-xs font-semibold text-navy dark:bg-surface-alt dark:text-foreground">
              {category}
            </span>
            <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
              {serviceMode}
            </span>
          </div>

          <div>
            <h3 className="text-lg leading-snug font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{technician}</p>
          </div>

          <dl className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Base price</dt>
              <dd className="font-semibold">{formatPrice(service?.basePrice)}</dd>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock3 aria-hidden="true" className="size-4 shrink-0" />
              <dt className="sr-only">Estimated duration</dt>
              <dd>{duration}</dd>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin aria-hidden="true" className="size-4 shrink-0" />
              <dt className="sr-only">Service area</dt>
              <dd>{area}</dd>
            </div>
          </dl>

          <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-teal-strong dark:text-teal">
            View details
            <ArrowRight aria-hidden="true" className="size-4" />
          </span>
        </div>
      </Link>
    </article>
  );
}
