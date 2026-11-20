import { Suspense } from "react";

import PageContainer from "@/components/layout/page-container";
import ServiceDetail from "@/components/services/service-detail";
import { DetailSkeleton } from "@/components/services/service-states";

export const metadata = {
  title: "Service details",
  description: "Public details for an approved FixMate repair service.",
};

export default function ServiceDetailPage({ params }) {
  return (
    <main id="main-content" className="flex-1 py-10 sm:py-12">
      <PageContainer>
        <Suspense fallback={<DetailSkeleton />}>
          <ServiceDetail params={params} />
        </Suspense>
      </PageContainer>
    </main>
  );
}
