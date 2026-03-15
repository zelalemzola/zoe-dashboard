import { createClient } from "@/lib/supabase/server";
import { getNotificationSummary } from "@/lib/notifications";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";
  const summary = await getNotificationSummary(supabase, user.id, isAdmin);
  return NextResponse.json(summary);
}
