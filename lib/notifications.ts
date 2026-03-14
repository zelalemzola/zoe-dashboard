import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationItem = {
  id: string;
  type: "low_stock" | "overdue_credit" | "pending_order" | "lead_due" | "task_assigned" | "task_due_soon";
  title: string;
  message: string;
  href: string;
  variant: "warning" | "danger" | "info";
};

export type NotificationSummary = {
  items: NotificationItem[];
  totalCount: number;
};

const LOW_STOCK_THRESHOLD = 10;
const TASKS_DUE_SOON_DAYS = 7;

export async function getNotificationSummary(
  supabase: SupabaseClient,
  userId: string,
  isAdmin: boolean
): Promise<NotificationSummary> {
  const today = new Date().toISOString().slice(0, 10);
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + TASKS_DUE_SOON_DAYS);
  const dueSoonEnd = futureDate.toISOString().slice(0, 10);

  const items: NotificationItem[] = [];

  // Low stock (admin only)
  if (isAdmin) {
    const { data: products } = await supabase
      .from("products")
      .select("id, name, quantity")
      .lt("quantity", LOW_STOCK_THRESHOLD);
    const lowStock = products || [];
    lowStock.forEach((p) => {
      items.push({
        id: `low-${p.id}`,
        type: "low_stock",
        title: "Low stock",
        message: `${p.name} (${p.quantity} left)`,
        href: "/inventory",
        variant: "warning",
      });
    });
  }

  // Overdue credits (admin only)
  if (isAdmin) {
    const { data: clientCredits } = await supabase
      .from("sales")
      .select("id, total_amount, credit_due_date, customer:customers(name)")
      .eq("is_paid", false)
      .not("credit_due_date", "is", null)
      .lt("credit_due_date", today);
    const overdue = clientCredits || [];
    overdue.forEach((c) => {
      const cust = c.customer as { name?: string } | { name?: string }[] | null;
      const customerName = Array.isArray(cust) ? cust[0]?.name : cust?.name;
      items.push({
        id: `credit-${c.id}`,
        type: "overdue_credit",
        title: "Overdue credit",
        message: `ETB ${Number(c.total_amount || 0).toLocaleString()} - ${customerName || "Unknown"}`,
        href: "/credits",
        variant: "danger",
      });
    });
  }

  // Pending orders (admin only)
  if (isAdmin) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, delivery_date, customer:customers(name)")
      .in("status", ["pending", "processing"]);
    const pending = orders || [];
    pending.forEach((o) => {
      const cust = o.customer as { name?: string } | { name?: string }[] | null;
      const customerName = Array.isArray(cust) ? cust[0]?.name : cust?.name;
      items.push({
        id: `order-${o.id}`,
        type: "pending_order",
        title: "Pending order",
        message: `${customerName || "Unknown"} - ${o.delivery_date}`,
        href: "/orders",
        variant: "info",
      });
    });
  }

  // Leads due for follow-up (both admin and sales)
  const { data: leadsDue } = await supabase
    .from("leads")
    .select("id, cafe_name, follow_up_date")
    .eq("status", "pending")
    .lte("follow_up_date", today)
    .not("follow_up_date", "is", null);
  (leadsDue || []).forEach((l) => {
    items.push({
      id: `lead-${l.id}`,
      type: "lead_due",
      title: "Lead follow-up",
      message: `${l.cafe_name} - due ${l.follow_up_date}`,
      href: "/leads",
      variant: "warning",
    });
  });

  // Tasks assigned to user (not done)
  const { data: myTasks } = await supabase
    .from("tasks")
    .select("id, title, deadline, status")
    .eq("assignee_id", userId)
    .neq("status", "done");

  // Tasks due soon (subset: deadline in next 7 days)
  const { data: tasksDueSoon } = await supabase
    .from("tasks")
    .select("id, title, deadline")
    .eq("assignee_id", userId)
    .neq("status", "done")
    .not("deadline", "is", null)
    .gte("deadline", today)
    .lte("deadline", dueSoonEnd);

  const dueSoonIds = new Set((tasksDueSoon || []).map((t) => t.id));

  (myTasks || []).forEach((t) => {
    const deadline = t.deadline?.slice(0, 10);
    if (dueSoonIds.has(t.id) && deadline) {
      items.push({
        id: `task-due-${t.id}`,
        type: "task_due_soon",
        title: "Task due soon",
        message: `${t.title} - ${deadline}`,
        href: "/tasks",
        variant: "warning",
      });
    } else {
      items.push({
        id: `task-${t.id}`,
        type: "task_assigned",
        title: "My task",
        message: `${t.title}${deadline ? ` - due ${deadline}` : ""}`,
        href: "/tasks",
        variant: "info",
      });
    }
  });

  return { items, totalCount: items.length };
}
