import ServiceCard from "@/components/services/service-card";
import {
  EmptyState,
  ErrorState,
  serviceErrorCopy,
} from "@/components/services/service-states";
import { getPublicServices } from "@/lib/service-api";

export default async function LatestServices() {
  const result = await getPublicServices({ sort: "newest", page: 1, limit: 6 });

  if (!result.ok) {
    return (
      <ErrorState
        title={serviceErrorCopy(result.reason).title}
        description={serviceErrorCopy(result.reason).description}
        href="/services"
        actionLabel="Go to services"
      />
    );
  }

  if (result.data.items.length === 0) {
    return (
      <EmptyState
        title="No services published yet"
        description="There are no approved, available services to show right now."
        href="/services"
        actionLabel="Visit services"
      />
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {result.data.items.map((service, index) => {
        const rawId = service?._id;
        const key =
          typeof rawId === "string" && rawId ? rawId : `latest-${index}`;

        return <ServiceCard key={key} service={service} />;
      })}
    </div>
  );
}
