import PageContainer from "@/components/layout/page-container";
import { DetailSkeleton } from "@/components/services/service-states";

export default function LoadingServiceDetail() {
  return (
    <main id="main-content" className="flex-1 py-10 sm:py-12">
      <PageContainer>
        <DetailSkeleton />
      </PageContainer>
    </main>
  );
}
