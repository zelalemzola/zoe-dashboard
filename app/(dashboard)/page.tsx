import { createClient } from "@/lib/supabase/server";
import { format, subDays } from "date-fns";
import { DashboardStats } from "./dashboard-stats";
import { DashboardCharts } from "./dashboard-charts";
import { DashboardAlerts } from "./dashboard-alerts";
import { DashboardRecent } from "./dashboard-recent";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Sales - completed only for revenue
  const { data: sales } = await supabase
    .from("sales")
    .select("total_amount, sale_date, completed_at")
    .order("sale_date", { ascending: false });

  // Restocks
  const { data: restocks } = await supabase
    .from("restocks")
    .select("quantity, unit_price, restock_date, is_paid")
    .eq("is_paid", true);

  const { data: costs } = await supabase
    .from("costs")
    .select("amount, date, type");

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, delivery_date, customer:customers(name)")
    .order("delivery_date", { ascending: false })
    .limit(5);

  const { data: products } = await supabase
    .from("products")
    .select("id, name, quantity");

  const { data: clientCredits } = await supabase
    .from("sales")
    .select("id, total_amount, credit_due_date, customer:customers(name)")
    .eq("is_paid", false)
    .not("credit_due_date", "is", null);

  const completedSales = (sales || []).filter((s) => s.completed_at);
  const revenue = completedSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const costFromRestocks = (restocks || []).reduce(
    (sum, r) => sum + Number(r.quantity || 0) * Number(r.unit_price || 0),
    0
  );
  const costFromCosts = (costs || []).reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const totalCost = costFromRestocks + costFromCosts;
  const profit = revenue - totalCost;
  const openingCapital = 94_243.39;
  const balance = openingCapital + profit;

  // Chart data - last 14 days
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(new Date(), 13 - i);
    return format(d, "yyyy-MM-dd");
  });
  const revenueByDay = last14Days.map((date) => {
    const daySales = completedSales.filter((s) => s.sale_date === date);
    return {
      date: format(new Date(date), "MMM d"),
      revenue: daySales.reduce((s, x) => s + Number(x.total_amount || 0), 0),
      sales: daySales.length,
    };
  });

  const lowStockProducts = (products || []).filter((p) => Number(p.quantity || 0) < 10);
  const today = new Date().toISOString().slice(0, 10);
  const overdueCredits = (clientCredits || []).filter(
    (c) => c.credit_due_date && c.credit_due_date < today
  );
  const pendingOrders = (orders || []).filter((o) => o.status === "pending" || o.status === "processing");

  const { data: leadsDue } = await supabase
    .from("leads")
    .select("id")
    .eq("status", "pending")
    .lte("follow_up_date", today)
    .not("follow_up_date", "is", null);
  const leadsDueCount = leadsDue?.length ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your coffee distribution business
        </p>
      </div>

      <DashboardAlerts
        lowStockCount={lowStockProducts.length}
        overdueCreditsCount={overdueCredits.length}
        overdueAmount={overdueCredits.reduce((s, c) => s + Number(c.total_amount || 0), 0)}
        pendingOrdersCount={pendingOrders.length}
        leadsDueCount={leadsDueCount}
      />

      <DashboardStats
        revenue={revenue}
        totalCost={totalCost}
        profit={profit}
        balance={balance}
        salesCount={completedSales.length}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardCharts data={revenueByDay} />
        </div>
        <div>
          <DashboardRecent orders={orders || []} lowStock={lowStockProducts} />
        </div>
      </div>
    </div>
  );
}
