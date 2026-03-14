import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LeadsClient } from "./leads-client";

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("follow_up_date", { ascending: true });

  const today = new Date().toISOString().slice(0, 10);
  const dueForFollowUp = (leads || []).filter(
    (l) => l.status === "pending" && l.follow_up_date && l.follow_up_date <= today
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales Leads</h1>
        <p className="text-muted-foreground">
          Report cafés from outreach. Track status and set follow-up reminders.
        </p>
      </div>
      <LeadsClient
        leads={leads || []}
        currentUserId={user.id}
        dueForFollowUp={dueForFollowUp}
      />
    </div>
  );
}
