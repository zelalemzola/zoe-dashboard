"use client";

import Link from "next/link";
import { Bell, Package, CreditCard, ShoppingCart, MapPin, CheckSquare, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { NotificationSummary } from "@/lib/notifications";

const iconMap = {
  low_stock: Package,
  overdue_credit: CreditCard,
  pending_order: ShoppingCart,
  lead_due: MapPin,
  task_assigned: CheckSquare,
  task_due_soon: CheckSquare,
};

interface NotificationCenterProps {
  notifications: NotificationSummary;
}

export function NotificationCenter({ notifications }: NotificationCenterProps) {
  const { items, totalCount } = notifications;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {totalCount > 99 ? "99+" : totalCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          <p className="text-xs text-muted-foreground">
            {totalCount === 0
              ? "You're all caught up"
              : `${totalCount} item${totalCount === 1 ? "" : "s"} need attention`}
          </p>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
              <Bell className="mb-2 h-10 w-10 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item) => {
                const Icon = iconMap[item.type];
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                        item.variant === "danger"
                          ? "bg-destructive/10 text-destructive"
                          : item.variant === "warning"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.message}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
