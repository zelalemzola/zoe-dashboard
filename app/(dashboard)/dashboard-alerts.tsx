"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, CreditCard, ShoppingCart, ChevronRight, MapPin } from "lucide-react";

interface DashboardAlertsProps {
  lowStockCount: number;
  overdueCreditsCount: number;
  overdueAmount: number;
  pendingOrdersCount: number;
  leadsDueCount?: number;
}

export function DashboardAlerts({
  lowStockCount,
  overdueCreditsCount,
  overdueAmount,
  pendingOrdersCount,
  leadsDueCount = 0,
}: DashboardAlertsProps) {
  const alerts = [
    {
      title: "Low stock",
      count: lowStockCount,
      message: `${lowStockCount} product(s) running low`,
      href: "/inventory",
      icon: Package,
      variant: "warning" as const,
    },
    {
      title: "Overdue credits",
      count: overdueCreditsCount,
      message: `ETB ${overdueAmount.toLocaleString()} from ${overdueCreditsCount} client(s)`,
      href: "/credits",
      icon: CreditCard,
      variant: "danger" as const,
    },
    {
      title: "Pending orders",
      count: pendingOrdersCount,
      message: `${pendingOrdersCount} order(s) to process`,
      href: "/orders",
      icon: ShoppingCart,
      variant: "info" as const,
    },
    {
      title: "Leads to follow up",
      count: leadsDueCount,
      message: `${leadsDueCount} lead(s) due for follow-up`,
      href: "/leads",
      icon: MapPin,
      variant: "warning" as const,
    },
  ].filter((a) => a.count > 0);

  if (alerts.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <span className="font-medium">Notifications</span>
          </div>
          <div className="flex flex-1 flex-wrap gap-3">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <Link key={alert.title} href={alert.href}>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-auto gap-2 py-1.5 ${
                      alert.variant === "danger"
                        ? "border-destructive/50 text-destructive hover:bg-destructive/10"
                        : alert.variant === "warning"
                        ? "border-primary/50 text-primary hover:bg-primary/10"
                        : ""
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{alert.message}</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
