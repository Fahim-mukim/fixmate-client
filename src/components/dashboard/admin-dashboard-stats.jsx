"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { adminUserApi } from "@/lib/admin-user-api.js";
import { adminUserErrorMessage } from "@/lib/admin-user-contract.js";
import { DashboardBarChart } from "./dashboard-chart.jsx";
import { StatCard, StatCardSkeleton, StatsGrid } from "./stat-card.jsx";

const ADMIN_CHART_CONFIG = Object.freeze({
  value: { label: "Count", color: "var(--chart-3)" },
});

export default function AdminDashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await adminUserApi.getAdminStats();
    if (result.ok) {
      setStats(result.data);
    } else {
      setStats(null);
      setError(adminUserErrorMessage(result, "Unable to load admin statistics."));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const chartData = stats
    ? [
        { name: "Total users", value: stats.totalUsers },
        { name: "Technicians", value: stats.totalTechnicians },
        { name: "Pending services", value: stats.pendingServices },
      ]
    : [];

  if (loading) {
    return (
      <StatsGrid label="Admin dashboard statistics">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </StatsGrid>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-danger/35 bg-danger/5 p-4 text-sm text-destructive"
      >
        <p>{error}</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
          Retry statistics
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <StatsGrid label="Admin dashboard statistics">
        <StatCard label="Total Users" value={stats.totalUsers} note="Canonical Better Auth user records" />
        <StatCard label="Total Technicians" value={stats.totalTechnicians} note="Users with technician role" />
        <StatCard label="Pending Services" value={stats.pendingServices} note="Services awaiting moderation" />
      </StatsGrid>
      <DashboardBarChart
        title="Platform overview"
        description="Global admin counts from server-side aggregation."
        data={chartData}
        config={ADMIN_CHART_CONFIG}
        emptyMessage="No platform statistics yet. Counts will appear as users and services are created."
      />
    </div>
  );
}
