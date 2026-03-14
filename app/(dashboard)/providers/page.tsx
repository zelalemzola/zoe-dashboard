import { createClient } from "@/lib/supabase/server";
import { ProvidersClient } from "./providers-client";
import { redirect } from "next/navigation";

export default async function ProvidersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: providers } = await supabase
    .from("providers")
    .select("*")
    .order("name");

  const { data: providerPrices } = await supabase
    .from("provider_prices")
    .select("*, product:products(id, name)");

  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Providers</h1>
        <p className="text-muted-foreground">
          Manage product providers and their pricing
        </p>
      </div>
      <ProvidersClient
        providers={providers || []}
        providerPrices={providerPrices || []}
        products={products || []}
      />
    </div>
  );
}
