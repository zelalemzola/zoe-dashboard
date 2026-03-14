import { createClient } from "@/lib/supabase/server";
import { SalesClient } from "./sales-client";
import { redirect } from "next/navigation";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const params = await searchParams;
  const orderId = params.order;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sales } = await supabase
    .from("sales")
    .select(`
      *,
      customer:customers(id, name),
      sale_items(*, product:products(id, name))
    `)
    .order("sale_date", { ascending: false });

  const { data: allOrders } = await supabase
    .from("orders")
    .select(`
      id,
      customer_id,
      delivery_date,
      customer:customers(id, name),
      order_items(*, product:products(id, name, unit))
    `)
    .eq("status", "delivered")
    .order("delivery_date", { ascending: false });

  const soldOrderIds = (sales || [])
    .map((s: { order_id?: string }) => s.order_id)
    .filter(Boolean);
  const orders = (allOrders || []).filter((o: { id: string }) => !soldOrderIds.includes(o.id));

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, payment_type, credit_days")
    .order("name");

  const { data: customerPrices } = await supabase
    .from("customer_prices")
    .select("customer_id, product_id, price");

  const { data: products } = await supabase
    .from("products")
    .select("id, name, unit")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
        <p className="text-muted-foreground">
          Record sales from orders and track completion tasks
        </p>
      </div>
      <SalesClient
        sales={sales || []}
        orders={orders || []}
        customers={customers || []}
        customerPrices={customerPrices || []}
        products={products || []}
        currentUserId={user.id}
        preselectedOrderId={orderId || undefined}
      />
    </div>
  );
}
