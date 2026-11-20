import { Suspense } from "react";

import PageContainer from "@/components/layout/page-container";
import {
  ServicesFilterFallback,
} from "@/components/services/service-filters";
import ServicesContent from "@/components/services/services-content";
import { ServicesSkeleton } from "@/components/services/service-states";

export const metadata = {
  title: "Browse services",
  description: "Search approved, available FixMate repair services.",
};

function ServicesFallback() {
  return (
    <div className="space-y-6">
      <ServicesFilterFallback />
      <ServicesSkeleton />
    </div>
  );
}

export default function ServicesPage({ searchParams }) {
  return (
    <main id="main-content" className="flex-1 py-10 sm:py-12">
      <PageContainer>
        <header className="mb-8 max-w-2xl">
          <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-teal-strong uppercase dark:text-teal">
            Public marketplace
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Browse repair services</h1>
          <p className="mt-3 leading-7 text-muted-foreground">
            Search by keyword, category, service mode, or price. Filters and pagination are stored in the URL so you can refresh or share a result.
          </p>
        </header>

        <Suspense fallback={<ServicesFallback />}>
          <ServicesContent searchParams={searchParams} />
        </Suspense>
      </PageContainer>
    </main>
  );
}
