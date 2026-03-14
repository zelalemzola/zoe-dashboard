import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const admin = createAdminClient();

    const { data: existingAdmins } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (existingAdmins && existingAdmins.length > 0) {
      return NextResponse.json(
        { error: "Admin user already exists" },
        { status: 400 }
      );
    }

    const { data: newUser, error } = await admin.auth.admin.createUser({
      email: "admin@zoecoffee.com",
      password: "Admin123!",
      email_confirm: true,
      user_metadata: { full_name: "Administrator" },
    });

    if (error) throw error;

    await admin
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", newUser.user.id);

    return NextResponse.json({
      success: true,
      credentials: {
        email: "admin@zoecoffee.com",
        password: "Admin123!",
        message: "Change this password after first login!",
      },
    });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create admin" },
      { status: 500 }
    );
  }
}
