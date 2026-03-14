"use client";

import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartDateFilter } from "./chart-date-filter";

interface ChartData {
  date: string;
  revenue: number;
  sales: number;
}

export function DashboardCharts({
  data,
  description,
  filterMonth,
  filterYear,
}: {
  data: ChartData[];
  description: string;
  filterMonth: number | null;
  filterYear: number | null;
}) {
  return (
    <Card className="border-0 shadow-lg shadow-primary/5">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Revenue trend</CardTitle>
            <CardDescription>{description} of completed sales</CardDescription>
          </div>
          <Suspense fallback={null}>
            <ChartDateFilter month={filterMonth} year={filterYear} />
          </Suspense>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.5 0.2 250)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.5 0.2 250)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => `ETB ${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.[0] ? (
                    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
                      <p className="font-medium">{payload[0].payload.date}</p>
                      <p className="text-sm text-primary">
                        ETB {Number(payload[0].value).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payload[0].payload.sales} sale(s)
                      </p>
                    </div>
                  ) : null
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="oklch(0.5 0.2 250)"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
