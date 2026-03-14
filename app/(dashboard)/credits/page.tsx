import { createClient } from "@/lib/supabase/server";
import { CreditsClient } from "./credits-client";
import { redirect } from "next/navigation";

export default async function CreditsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clientCredits } = await supabase
    .from("sales")
    .select(`
      id,
      customer_id,
      total_amount,
      sale_date,
      credit_due_date,
      is_paid,
      customer:customers(id, name, contact)
    `)
    .eq("is_paid", false)
    .not("credit_due_date", "is", null);

  const { data: providerCredits } = await supabase
    .from("restocks")
    .select(`
      id,
      provider_id,
      product_id,
      quantity,
      unit_price,
      restock_date,
      credit_due_date,
      is_paid,
      provider:providers(id, name),
      product:products(id, name)
    `)
    .eq("is_paid", false)
    .not("credit_due_date", "is", null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credit Tracking</h1>
        <p className="text-muted-foreground">
          Track client credit and provider payables
        </p>
      </div>
      <CreditsClient
        clientCredits={clientCredits || []}
        providerCredits={providerCredits || []}
      />
    </div>
  );
}
