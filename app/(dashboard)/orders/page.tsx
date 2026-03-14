import { createClient } from "@/lib/supabase/server";
import { OrdersClient } from "./orders-client";
import { redirect } from "next/navigation";

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      *,
      customer:customers(id, name),
      order_items(*, product:products(id, name))
    `)
    .order("delivery_date", { ascending: false });

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, payment_type, credit_days")
    .order("name");

  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .order("name");

  const { data: customerPrices } = await supabase
    .from("customer_prices")
    .select("customer_id, product_id, price");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">
          Manage customer orders and delivery schedules
        </p>
      </div>
      <OrdersClient
        orders={orders || []}
        customers={customers || []}
        products={products || []}
        customerPrices={customerPrices || []}
        currentUserId={user.id}
      />
    </div>
  );
}
