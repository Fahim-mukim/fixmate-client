import { Skeleton } from "@/components/ui/skeleton";

export function StatCard({ label, value, note }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-16" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}

export function StatsGrid({ children, label = "Dashboard statistics" }) {
  return (
    <section aria-label={label} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {children}
    </section>
  );
}
