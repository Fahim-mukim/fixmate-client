"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export function DashboardBarChart({
  title,
  description,
  data,
  config,
  dataKey = "value",
  nameKey = "name",
  emptyMessage = "No data to chart yet.",
}) {
  const hasData = Array.isArray(data) && data.some((item) => Number(item?.[dataKey]) > 0);
  const total = Array.isArray(data)
    ? data.reduce((sum, item) => sum + (Number(item?.[dataKey]) || 0), 0)
    : 0;

  return (
    <section
      aria-label={title}
      className="rounded-xl border border-border bg-surface p-4"
    >
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {hasData ? (
        <>
          <ChartContainer config={config} className="min-h-[220px] w-full">
            <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey={nameKey}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
          <table className="sr-only">
            <caption>{title}</caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Count</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={String(item?.[nameKey])}>
                  <td>{String(item?.[nameKey])}</td>
                  <td>{Number(item?.[dataKey]) || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-border bg-background/40 px-4 text-center text-sm text-muted-foreground">
          {total === 0 ? emptyMessage : "Chart data is unavailable."}
        </div>
      )}
    </section>
  );
}
