import { createClient } from "@/lib/supabase/server";
import { CreditsClient } from "./credits-client";
import { redirect } from "next/navigation";
import { AlertBanner } from "@/components/alert-banner";

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

  const today = new Date().toISOString().slice(0, 10);
  const overdueClient = (clientCredits || []).filter(
    (c) => c.credit_due_date && c.credit_due_date < today
  );
  const overdueProvider = (providerCredits || []).filter(
    (c) => c.credit_due_date && c.credit_due_date < today
  );
  const overdueTotal = overdueClient.reduce((s, c) => s + Number(c.total_amount || 0), 0) +
    overdueProvider.reduce((s, c) => s + Number(c.quantity || 0) * Number(c.unit_price || 0), 0);
  const overdueCount = overdueClient.length + overdueProvider.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credit Tracking</h1>
        <p className="text-muted-foreground">
          Track client credit and provider payables
        </p>
      </div>
      {overdueCount > 0 && (
        <AlertBanner
          message={`ETB ${overdueTotal.toLocaleString()} overdue from ${overdueCount} credit(s)`}
          href="/credits"
          variant="danger"
        />
      )}
      <CreditsClient
        clientCredits={clientCredits || []}
        providerCredits={providerCredits || []}
      />
    </div>
  );
}
