import PageContainer from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main id="main-content" className="flex-1 py-14">
      <PageContainer className="space-y-5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-12 w-2/3 max-w-xl" />
        <Skeleton className="h-5 w-full max-w-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </PageContainer>
    </main>
  );
}
