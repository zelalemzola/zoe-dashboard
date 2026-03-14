"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface Order {
  id: string;
  status: string;
  delivery_date: string;
  customer?: { name?: string } | { name?: string }[];
}

interface Product {
  id: string;
  name: string;
  quantity: number;
}

export function DashboardRecent({
  orders,
  lowStock,
}: {
  orders: Order[];
  lowStock: Product[];
}) {
  const getCustomerName = (o: Order) =>
    Array.isArray(o.customer) ? o.customer[0]?.name : (o.customer as { name?: string })?.name;

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg shadow-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4" />
            Recent orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <Link key={order.id} href="/orders">
                <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{getCustomerName(order) || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.delivery_date), "MMM d")}
                    </p>
                  </div>
                  <Badge
                    variant={
                      order.status === "delivered"
                        ? "secondary"
                        : order.status === "cancelled"
                        ? "outline"
                        : "default"
                    }
                  >
                    {order.status}
                  </Badge>
                </div>
              </Link>
            ))}
            {orders.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No orders yet</p>
            )}
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
            <Link href="/orders">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg shadow-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Low stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {lowStock.slice(0, 5).map((p) => (
              <Link key={p.id} href="/inventory">
                <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                  <span className="text-sm font-medium">{p.name}</span>
                  <Badge variant="destructive" className="text-xs">
                    {p.quantity} left
                  </Badge>
                </div>
              </Link>
            ))}
            {lowStock.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">All stocked</p>
            )}
          </div>
          {lowStock.length > 0 && (
            <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
              <Link href="/inventory">
                Restock <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
