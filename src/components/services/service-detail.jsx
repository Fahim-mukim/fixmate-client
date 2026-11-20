import { ArrowLeft, Clock3, MapPin } from "lucide-react";
import Link from "next/link";

import ServiceImage from "@/components/services/service-image";
import {
  ErrorState,
  serviceErrorCopy,
} from "@/components/services/service-states";
import ButtonLink from "@/components/ui/button-link";
import { getPublicServiceById } from "@/lib/service-api";
import { formatPrice, isValidServiceId } from "@/lib/service-utils";

function textOrFallback(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function ServiceDetail({ params }) {
  const { id } = await params;

  if (!isValidServiceId(id)) {
    const copy = serviceErrorCopy("invalid-id");
    return (
      <ErrorState
        title={copy.title}
        description={copy.description}
        href="/services"
        actionLabel="Browse services"
      />
    );
  }

  const result = await getPublicServiceById(id);

  if (!result.ok) {
    const copy = serviceErrorCopy(result.reason);
    return (
      <ErrorState
        title={copy.title}
        description={copy.description}
        href="/services"
        actionLabel="Browse services"
      />
    );
  }

  const service = result.data;
  const title = textOrFallback(service.title, "Untitled service");
  const category = textOrFallback(service.category, "Uncategorized");
  const description = textOrFallback(
    service.description,
    "No description was provided for this service."
  );
  const technician = textOrFallback(
    service.technicianName,
    "Technician not provided"
  );
  const mode = textOrFallback(service.serviceMode, "Service mode not provided");
  const area = textOrFallback(service.serviceArea, "Service area not provided");
  const duration = textOrFallback(
    service.estimatedDuration,
    "Duration not provided"
  );

  return (
    <article className="space-y-7">
      <Link
        href="/services"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to services
      </Link>

      <header className="space-y-4">
        <p className="text-xs font-semibold tracking-[0.18em] text-teal-strong uppercase dark:text-teal">
          {category}
        </p>
        <h1 className="max-w-3xl text-3xl leading-tight font-bold sm:text-4xl lg:text-5xl">
          {title}
        </h1>
      </header>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <ServiceImage
          src={service.image}
          alt={`${title} repair service`}
          priority
          className="aspect-16/7 w-full"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section aria-labelledby="service-description-heading">
          <h2 id="service-description-heading" className="text-xl font-semibold">
            About this service
          </h2>
          <p className="mt-3 leading-7 text-muted-foreground whitespace-pre-line">
            {description}
          </p>

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Clock3 aria-hidden="true" className="size-4" />
              {duration}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4" />
              {area}
            </span>
          </div>
        </section>

        <aside
          aria-labelledby="service-summary-heading"
          className="h-fit rounded-2xl border border-border bg-surface p-5"
        >
          <h2 id="service-summary-heading" className="text-lg font-semibold">
            Service summary
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Provided by {technician}</p>
          <p className="mt-5 text-3xl font-bold">{formatPrice(service.basePrice)}</p>
          <p className="text-xs text-muted-foreground">Base price</p>

          <dl className="mt-5 border-t border-border">
            <DetailRow label="Category" value={category} />
            <DetailRow label="Service mode" value={mode} />
            <DetailRow label="Estimated duration" value={duration} />
            <DetailRow label="Service area" value={area} />
          </dl>

          <div
            role="status"
            className="mt-5 rounded-lg border border-border bg-mist px-3 py-3 text-sm leading-6 text-navy dark:bg-surface-alt dark:text-foreground"
          >
            Booking requests are not available in this phase. This page only displays
            publicly available service information.
          </div>

          <ButtonLink href="/services" variant="outline" className="mt-4 w-full">
            Explore more services
          </ButtonLink>
        </aside>
      </div>
    </article>
  );
}
