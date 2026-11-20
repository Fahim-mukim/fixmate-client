import PageContainer from "@/components/layout/page-container";
import { ServicesSkeleton } from "@/components/services/service-states";

export default function LoadingServices() {
  return (
    <main id="main-content" className="flex-1 py-10 sm:py-12">
      <PageContainer>
        <div className="mb-8">
          <div className="mb-3 h-3 w-32 animate-pulse rounded bg-mist dark:bg-surface-alt" />
          <div className="h-9 w-72 max-w-full animate-pulse rounded bg-mist dark:bg-surface-alt" />
        </div>
        <ServicesSkeleton />
      </PageContainer>
    </main>
  );
}
