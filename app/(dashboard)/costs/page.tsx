import { createClient } from "@/lib/supabase/server";
import { CostsClient } from "./costs-client";
import { redirect } from "next/navigation";

export default async function CostsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: costs } = await supabase
    .from("costs")
    .select("*")
    .order("date", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Costs</h1>
        <p className="text-muted-foreground">
          Track recurring and one-time expenses
        </p>
      </div>
      <CostsClient costs={costs || []} currentUserId={user.id} />
    </div>
  );
}
