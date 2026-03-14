"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Receipt } from "lucide-react";

interface DashboardStatsProps {
  revenue: number;
  totalCost: number;
  profit: number;
  balance: number;
  salesCount?: number;
}

export function DashboardStats({
  revenue,
  totalCost,
  profit,
  balance,
  salesCount = 0,
}: DashboardStatsProps) {
  const stats = [
    {
      title: "Revenue",
      value: revenue,
      icon: DollarSign,
      description: `${salesCount} completed sale(s)`,
      trend: null as "up" | "down" | null,
    },
    {
      title: "Costs",
      value: totalCost,
      icon: TrendingDown,
      description: "Restocks & expenses",
      trend: null,
    },
    {
      title: "Profit",
      value: profit,
      icon: TrendingUp,
      description: profit >= 0 ? "Net gain" : "Net loss",
      trend: profit >= 0 ? ("up" as const) : ("down" as const),
    },
    {
      title: "Balance",
      value: balance,
      icon: Wallet,
      description: "Current balance",
      trend: balance >= 0 ? ("up" as const) : ("down" as const),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            className="overflow-hidden border-0 shadow-lg shadow-primary/5 transition-shadow hover:shadow-xl hover:shadow-primary/10"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                {stat.trend && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      stat.trend === "up"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {stat.trend === "up" ? "+" : ""}
                  </span>
                )}
              </div>
              <p className="mt-4 text-2xl font-bold tracking-tight">
                ETB {stat.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm font-medium text-foreground">{stat.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
