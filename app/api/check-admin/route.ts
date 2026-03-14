import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1);
    if (error) throw error;
    return NextResponse.json({ hasAdmin: (data?.length ?? 0) > 0 });
  } catch {
    return NextResponse.json({ hasAdmin: false });
  }
}
