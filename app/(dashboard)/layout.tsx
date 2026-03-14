import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { HeaderUser } from "@/components/header-user";
import { AuthGuard } from "@/components/auth-guard";
import { getNotificationSummary } from "@/lib/notifications";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const notifications = await getNotificationSummary(supabase, user.id, isAdmin);

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar isAdmin={isAdmin} />
      <SidebarInset>
        <HeaderUser user={user} notifications={notifications} />
        <div className="flex flex-1 flex-col p-6 md:p-8 bg-muted/30">
          <AuthGuard isAdmin={isAdmin}>{children}</AuthGuard>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
