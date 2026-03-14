"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Receipt, MoreHorizontal, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface OrderWithItems {
  id: string;
  customer_id: string;
  customer?: { name: string } | { name: string }[];
  order_items?: { product_id: string; quantity: number; unit_price: number; product?: { name: string } }[];
}

export function SalesClient({
  sales: initialSales,
  orders,
  customers,
  customerPrices,
  products,
  currentUserId,
  preselectedOrderId,
}: {
  sales: unknown[];
  orders: OrderWithItems[];
  customers: { id: string; name: string; payment_type: string; credit_days: number }[];
  customerPrices: { customer_id: string; product_id: string; price: number }[];
  products: { id: string; name: string; unit?: string }[];
  currentUserId: string;
  preselectedOrderId?: string;
}) {
  const [sales, setSales] = useState(initialSales as Record<string, unknown>[]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteSaleOpen, setDeleteSaleOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Record<string, unknown> | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string>(preselectedOrderId || "");
  const [filterPaid, setFilterPaid] = useState<"all" | "yes" | "no">("all");
  const [filterReceipt, setFilterReceipt] = useState<"all" | "yes" | "no">("all");
  const [filterWithholding, setFilterWithholding] = useState<"all" | "yes" | "no">("all");
  const [filterComplete, setFilterComplete] = useState<"all" | "yes" | "no">("all");

  const supabase = createClient();

  useEffect(() => {
    if (preselectedOrderId) {
      setSelectedOrder(preselectedOrderId);
      setOpen(true);
    }
  }, [preselectedOrderId]);

  const order = orders.find((o) => o.id === selectedOrder);
  const customer = order ? customers.find((c) => c.id === order.customer_id) : null;
  const items = order?.order_items || [];
  const totalAmount = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const withholdingThreshold = 20_000;
  const baseForWithholding = totalAmount >= withholdingThreshold ? totalAmount / 1.15 : 0;
  const withholdingAmount = baseForWithholding > 0 ? baseForWithholding * 0.03 : 0;
  const amountReceived = totalAmount >= withholdingThreshold ? totalAmount - withholdingAmount : totalAmount;
  const isCredit = customer?.payment_type === "credit";
  const creditDays = customer?.credit_days || 0;
  const creditDueDate = isCredit
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() + creditDays);
        return format(d, "yyyy-MM-dd");
      })()
    : null;

  const handleCreateSale = async () => {
    if (!order) {
      toast.error("Select an order first");
      return;
    }
    setLoading(true);
    try {
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          order_id: order.id,
          customer_id: order.customer_id,
          sale_date: format(new Date(), "yyyy-MM-dd"),
          total_amount: totalAmount,
          withholding_amount: totalAmount >= withholdingThreshold ? withholdingAmount : null,
          is_paid: !isCredit,
          receipt_given: false,
          withholding_received: false,
          credit_due_date: creditDueDate,
          created_by: currentUserId,
        })
        .select()
        .single();
      if (saleErr) throw saleErr;
      for (const it of items) {
        await supabase.from("sale_items").insert({
          sale_id: sale.id,
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.unit_price,
        });
      }
      setSales((prev) => [sale, ...(prev as object[])]);
      setOpen(false);
      setSelectedOrder("");
      toast.success("Sale recorded");
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record sale");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSale = async () => {
    if (!saleToDelete) return;
    setLoading(true);
    try {
      const saleId = saleToDelete.id as string;
      const items = (saleToDelete.sale_items as { product_id: string; quantity: number }[]) || [];
      if (items.length === 0) {
        const { data } = await supabase
          .from("sale_items")
          .select("product_id, quantity")
          .eq("sale_id", saleId);
        items.push(...(data || []));
      }
      const qtyByProduct = items.reduce(
        (acc, it) => {
          acc[it.product_id] = (acc[it.product_id] || 0) + Number(it.quantity);
          return acc;
        },
        {} as Record<string, number>
      );
      const productIds = Object.keys(qtyByProduct);
      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from("products")
          .select("id, quantity")
          .in("id", productIds);
        for (const p of prods || []) {
          const addQty = qtyByProduct[p.id] || 0;
          const newQty = Math.max(0, Number(p.quantity ?? 0) + addQty);
          await supabase.from("products").update({ quantity: newQty }).eq("id", p.id);
        }
      }
      const { error } = await supabase.from("sales").delete().eq("id", saleId);
      if (error) throw error;
      setSales((prev) => prev.filter((x) => (x as { id: string }).id !== saleId));
      setDeleteSaleOpen(false);
      setSaleToDelete(null);
      toast.success("Sale deleted");
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete sale");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async (
    saleId: string,
    field: "is_paid" | "receipt_given" | "withholding_received",
    value: boolean
  ) => {
    try {
      const updates: Record<string, unknown> = { [field]: value };
      const s = sales.find((x) => (x as { id: string }).id === saleId) as Record<string, unknown>;
      const allDone =
        (field === "is_paid" ? value : (s?.is_paid as boolean)) &&
        (field === "receipt_given" ? value : (s?.receipt_given as boolean)) &&
        (field === "withholding_received" ? value : (s?.withholding_received as boolean));
      updates.completed_at = allDone ? new Date().toISOString() : null;
      const { error } = await supabase.from("sales").update(updates).eq("id", saleId);
      if (error) throw error;
      setSales((prev) =>
        prev.map((x) =>
          (x as { id: string }).id === saleId
            ? { ...x, ...updates }
            : x
        )
      );
      toast.success("Updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const filteredSales = sales.filter((s) => {
    const sale = s as Record<string, unknown>;
    if (filterPaid !== "all" && (sale.is_paid as boolean) !== (filterPaid === "yes")) return false;
    if (filterReceipt !== "all" && (sale.receipt_given as boolean) !== (filterReceipt === "yes"))
      return false;
    if (
      filterWithholding !== "all" &&
      (sale.withholding_received as boolean) !== (filterWithholding === "yes")
    )
      return false;
    const complete = !!sale.completed_at;
    if (filterComplete !== "all" && complete !== (filterComplete === "yes")) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Record Sale
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Sale from Order</DialogTitle>
              <DialogDescription>
                Select a delivered order to record as sale. Tasks (paid, receipt, withholding) must
                be completed for the sale to be marked complete.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select order</label>
                <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose delivered order" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {(Array.isArray(o.customer) ? o.customer[0] : o.customer)?.name} -{" "}
                        {o.order_items?.length} item(s) - ETB{" "}
                        {(
                          o.order_items?.reduce(
                            (s, i) => s + i.quantity * i.unit_price,
                            0
                          ) || 0
                        ).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {order && (
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="font-medium">{(Array.isArray(order.customer) ? order.customer[0] : order.customer)?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Total: ETB {totalAmount.toFixed(2)}
                    {totalAmount >= withholdingThreshold && (
                      <>
                        {" | "}Withholding (3% of base): ETB {withholdingAmount.toFixed(2)}
                        {" → "}Amount received: ETB {amountReceived.toFixed(2)}
                      </>
                    )}
                    {isCredit && ` | Credit: ${creditDays} days (due ${creditDueDate})`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totalAmount >= withholdingThreshold
                      ? "Sales ≥ ETB 20,000 have 3% withholding tax (base = total ÷ 1.15)."
                      : ""}{" "}
                    After recording: complete tasks (paid, receipt, withholding) to mark sale as
                    complete.
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button onClick={handleCreateSale} disabled={loading || !order}>
                  {loading ? "Recording..." : "Record sale"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={deleteSaleOpen} onOpenChange={setDeleteSaleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete sale</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this sale? This will restore the sold items to inventory and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteSaleOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSale}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Sales
              </CardTitle>
              <CardDescription>Filter by completion tasks</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filterComplete} onValueChange={(v: "all" | "yes" | "no") => setFilterComplete(v)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Complete" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Complete</SelectItem>
                  <SelectItem value="no">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPaid} onValueChange={(v: "all" | "yes" | "no") => setFilterPaid(v)}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Paid" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Paid</SelectItem>
                  <SelectItem value="no">Unpaid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterReceipt} onValueChange={(v: "all" | "yes" | "no") => setFilterReceipt(v)}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Receipt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Receipt ✓</SelectItem>
                  <SelectItem value="no">No receipt</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterWithholding} onValueChange={(v: "all" | "yes" | "no") => setFilterWithholding(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Withholding" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Withholding ✓</SelectItem>
                  <SelectItem value="no">No withholding</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Withholding</TableHead>
                <TableHead>Complete</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((s, index) => {
                const sale = s as Record<string, unknown>;
                const id = sale.id as string;
                return (
                  <TableRow key={id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>{format(new Date(sale.sale_date as string), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      {(Array.isArray(sale.customer) ? (sale.customer as { name?: string }[])[0] : sale.customer as { name?: string })?.name || "—"}
                    </TableCell>
                    <TableCell>
                      ETB {Number(sale.total_amount).toFixed(2)}
                      {Number(sale.withholding_amount ?? 0) > 0 ? (
                        <span className="block text-xs text-muted-foreground">
                          Net: ETB {(Number(sale.total_amount) - Number(sale.withholding_amount)).toFixed(2)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={!!sale.is_paid}
                        onCheckedChange={(v) =>
                          handleTaskUpdate(id, "is_paid", !!v)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={!!sale.receipt_given}
                        onCheckedChange={(v) =>
                          handleTaskUpdate(id, "receipt_given", !!v)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={!!sale.withholding_received}
                        onCheckedChange={(v) =>
                          handleTaskUpdate(id, "withholding_received", !!v)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {sale.completed_at ? (
                        <Badge variant="secondary">Complete</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => {
                              setSaleToDelete(sale);
                              setTimeout(() => setDeleteSaleOpen(true), 0);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
