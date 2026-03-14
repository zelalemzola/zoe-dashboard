import { createClient } from "@/lib/supabase/server";
import { InventoryClient } from "./inventory-client";
import { redirect } from "next/navigation";
import { AlertBanner } from "@/components/alert-banner";

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("name");

  const { data: restocks } = await supabase
    .from("restocks")
    .select(`
      *,
      product:products(id, name),
      provider:providers(id, name)
    `)
    .order("restock_date", { ascending: false })
    .limit(50);

  const { data: providers } = await supabase
    .from("providers")
    .select("id, name, payment_type, credit_days")
    .order("name");

  const lowStockProducts = (products || []).filter((p) => Number(p.quantity || 0) < 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">
          Manage product stock and restocking history
        </p>
      </div>
      {lowStockProducts.length > 0 && (
        <AlertBanner
          message={`${lowStockProducts.length} product(s) running low on stock`}
          href="/inventory"
          variant="warning"
        />
      )}
      <InventoryClient
        products={products || []}
        restocks={restocks || []}
        providers={providers || []}
        currentUserId={user.id}
      />
    </div>
  );
}
