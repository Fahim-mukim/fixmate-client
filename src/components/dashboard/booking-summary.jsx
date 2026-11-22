import { summarizeBookings } from "@/lib/booking-contract.js";

function StatCard({ label, value, note }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

export default function BookingSummary({ items = [], total, note = "On this page" }) {
  const summary = summarizeBookings(items);
  const hasTotal = Number.isSafeInteger(total) && total >= 0;

  return (
    <section aria-label="Booking summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total bookings"
        value={hasTotal ? total : summary.total}
        note={hasTotal ? "Reported by the server" : note}
      />
      <StatCard label="Active" value={summary.active} note={note} />
      <StatCard label="Awaiting action" value={summary.requested} note={note} />
      <StatCard label="Completed" value={summary.completed} note={note} />
    </section>
  );
}
