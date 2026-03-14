import { createClient } from "@/lib/supabase/server";
import { TasksClient } from "./tasks-client";
import { redirect } from "next/navigation";
import { AlertBanner } from "@/components/alert-banner";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name");

  const today = new Date().toISOString().slice(0, 10);
  const dueSoonEnd = new Date();
  dueSoonEnd.setDate(dueSoonEnd.getDate() + 7);
  const dueSoonEndStr = dueSoonEnd.toISOString().slice(0, 10);
  const myTasksDueSoon = (tasks || []).filter((t) => {
    const d = t.deadline?.slice(0, 10);
    return (
      t.assignee_id === user.id &&
      t.status !== "done" &&
      d &&
      d >= today &&
      d <= dueSoonEndStr
    );
  });
  const myTasksOverdue = (tasks || []).filter((t) => {
    const d = t.deadline?.slice(0, 10);
    return (
      t.assignee_id === user.id &&
      t.status !== "done" &&
      d &&
      d < today
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">
          Create, assign, and track tasks across your team
        </p>
      </div>
      {myTasksOverdue.length > 0 && (
        <AlertBanner
          message={`${myTasksOverdue.length} of your task(s) are overdue`}
          href="/tasks"
          variant="danger"
        />
      )}
      {myTasksOverdue.length === 0 && myTasksDueSoon.length > 0 && (
        <AlertBanner
          message={`${myTasksDueSoon.length} of your task(s) are due within 7 days`}
          href="/tasks"
          variant="warning"
        />
      )}
      <TasksClient
        tasks={tasks || []}
        profiles={profiles || []}
        currentUserId={user.id}
        isAdmin={profile?.role === "admin"}
      />
    </div>
  );
}
