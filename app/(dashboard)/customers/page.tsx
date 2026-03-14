import { createClient } from "@/lib/supabase/server";
import { CustomersClient } from "./customers-client";
import { redirect } from "next/navigation";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .order("name");

  const { data: customerPrices } = await supabase
    .from("customer_prices")
    .select("*, product:products(id, name)");

  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .order("name");

  const { data: sales } = await supabase
    .from("sales")
    .select("customer_id, sale_date, total_amount")
    .order("sale_date", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">
          Manage customer information and custom pricing
        </p>
      </div>
      <CustomersClient
        customers={customers || []}
        customerPrices={customerPrices || []}
        products={products || []}
        sales={sales || []}
      />
    </div>
  );
}
