import { createClient } from "@/lib/supabase/server";
import { format, subDays, getDaysInMonth, startOfMonth, eachDayOfInterval } from "date-fns";
import { DashboardStats } from "./dashboard-stats";
import { DashboardCharts } from "./dashboard-charts";
import { DashboardAlerts } from "./dashboard-alerts";
import { DashboardRecent } from "./dashboard-recent";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const monthParam = params.month ? parseInt(params.month, 10) : null;
  const yearParam = params.year ? parseInt(params.year, 10) : null;
  const useMonthFilter =
    monthParam != null &&
    monthParam >= 1 &&
    monthParam <= 12 &&
    yearParam != null &&
    yearParam >= 2020 &&
    yearParam <= 2100;
  const supabase = await createClient();

  // Sales - completed and paid only for revenue
  const { data: sales } = await supabase
    .from("sales")
    .select("total_amount, withholding_amount, sale_date, completed_at, is_paid")
    .order("sale_date", { ascending: false });

  // Restocks - use net amount (total - withholding) for costs when total >= 20,000
  const { data: restocks } = await supabase
    .from("restocks")
    .select("quantity, unit_price, withholding_amount, restock_date, is_paid")
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

  const completedSales = (sales || []).filter(
    (s) => s.completed_at && s.is_paid
  );
  const getNetAmount = (s: { total_amount?: number | null; withholding_amount?: number | null }) => {
    const total = Number(s.total_amount || 0);
    const withholding = Number(s.withholding_amount || 0);
    return total - withholding;
  };
  const revenue = completedSales.reduce((sum, s) => sum + getNetAmount(s), 0);
  const getRestockNetAmount = (r: { quantity?: number; unit_price?: number; withholding_amount?: number | null }) => {
    const total = Number(r.quantity || 0) * Number(r.unit_price || 0);
    if (total >= 20_000) {
      const withholding = Number(r.withholding_amount ?? 0) || (total / 1.15) * 0.03;
      return total - withholding;
    }
    return total;
  };
  const costFromRestocks = (restocks || []).reduce(
    (sum, r) => sum + getRestockNetAmount(r),
    0
  );
  const costFromCosts = (costs || []).reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const totalCost = costFromRestocks + costFromCosts;
  const profit = revenue - totalCost;
  const openingCapital = 141_932.96;
  const openingInventoryValue = 0; // Value of products in stock when you started (ETB)
  const balance = openingCapital + openingInventoryValue + profit;

  // Chart data - last 30 days or selected month
  let chartDates: string[];
  let chartDescription: string;
  if (useMonthFilter) {
    const start = startOfMonth(new Date(yearParam!, monthParam! - 1));
    const daysInMonth = getDaysInMonth(start);
    chartDates = eachDayOfInterval({
      start,
      end: new Date(yearParam!, monthParam! - 1, daysInMonth),
    }).map((d) => format(d, "yyyy-MM-dd"));
    chartDescription = `${format(start, "MMMM yyyy")}`;
  } else {
    chartDates = Array.from({ length: 30 }, (_, i) => {
      const d = subDays(new Date(), 29 - i);
      return format(d, "yyyy-MM-dd");
    });
    chartDescription = "Last 30 days";
  }
  const revenueByDay = chartDates.map((date) => {
    const daySales = completedSales.filter((s) => s.sale_date === date);
    return {
      date: format(new Date(date), "MMM d"),
      revenue: daySales.reduce((s, x) => s + getNetAmount(x), 0),
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
        openingInventoryValue={openingInventoryValue}
        salesCount={completedSales.length}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardCharts
            data={revenueByDay}
            description={chartDescription}
            filterMonth={useMonthFilter ? monthParam : null}
            filterYear={useMonthFilter ? yearParam : null}
          />
        </div>
        <div>
          <DashboardRecent orders={orders || []} lowStock={lowStockProducts} />
        </div>
      </div>
    </div>
  );
}
