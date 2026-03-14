"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, ShoppingCart, Trash2, MoreHorizontal, Pencil } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface OrderItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
}

interface OrderWithDetails {
  id: string;
  customer_id: string;
  delivery_date: string;
  status: string;
  payment_type: string;
  credit_days: number;
  customer?: { name: string };
  order_items?: { product_id: string; quantity: number; unit_price: number; product?: { name: string } }[];
}

export function OrdersClient({
  orders: initialOrders,
  customers,
  products,
  customerPrices,
  currentUserId,
}: {
  orders: OrderWithDetails[];
  customers: { id: string; name: string; payment_type: string; credit_days: number }[];
  products: { id: string; name: string }[];
  customerPrices: { customer_id: string; product_id: string; price: number }[];
  currentUserId: string;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [open, setOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteOrderOpen, setDeleteOrderOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<OrderWithDetails | null>(null);
  const [form, setForm] = useState({
    customer_id: "",
    delivery_date: format(new Date(), "yyyy-MM-dd"),
    payment_type: "" as "" | "on_delivery" | "credit",
    credit_days: 0,
    items: [] as OrderItemInput[],
  });

  const supabase = createClient();

  const getCustomerPrice = (customerId: string, productId: string) => {
    const cp = customerPrices.find(
      (c) => c.customer_id === customerId && c.product_id === productId
    );
    return cp?.price;
  };

  const addItem = () => {
    const customer = customers.find((c) => c.id === form.customer_id);
    const defaultPayment = customer?.payment_type || "on_delivery";
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          product_id: products[0]?.id || "",
          quantity: 1,
          unit_price:
            form.customer_id && products[0]
              ? getCustomerPrice(form.customer_id, products[0].id) || 0
              : 0,
        },
      ],
    }));
  };

  const updateItem = (idx: number, field: keyof OrderItemInput, value: string | number) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === "product_id" && form.customer_id) {
        const price = getCustomerPrice(form.customer_id, value as string);
        if (price) items[idx].unit_price = price;
      }
      return { ...f, items };
    });
  };

  const removeItem = (idx: number) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const onCustomerChange = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    setForm((f) => ({
      ...f,
      customer_id: customerId,
      payment_type: (customer?.payment_type as "on_delivery" | "credit") || "on_delivery",
      credit_days: customer?.credit_days || 0,
      items: f.items.map((it) => ({
        ...it,
        unit_price:
          getCustomerPrice(customerId, it.product_id) || it.unit_price,
      })),
    }));
  };

  const totalAmount = form.items.reduce(
    (sum, it) => sum + it.quantity * it.unit_price,
    0
  );

  const resetForm = () => {
    setForm({
      customer_id: "",
      delivery_date: format(new Date(), "yyyy-MM-dd"),
      payment_type: "",
      credit_days: 0,
      items: [],
    });
    setEditingOrder(null);
  };

  const handleOpenEdit = (order: OrderWithDetails) => {
    setEditingOrder(order);
    const items = order.order_items || [];
    setForm({
      customer_id: order.customer_id,
      delivery_date: order.delivery_date,
      payment_type: (order.payment_type as "on_delivery" | "credit") || "on_delivery",
      credit_days: order.credit_days || 0,
      items: items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_id || form.items.length === 0) {
      toast.error("Select customer and add at least one item");
      return;
    }
    setLoading(true);
    try {
      if (editingOrder) {
        const { error: orderErr } = await supabase
          .from("orders")
          .update({
            customer_id: form.customer_id,
            delivery_date: form.delivery_date,
            payment_type: form.payment_type || "on_delivery",
            credit_days: form.credit_days,
          })
          .eq("id", editingOrder.id);
        if (orderErr) throw orderErr;
        const { error: deleteErr } = await supabase
          .from("order_items")
          .delete()
          .eq("order_id", editingOrder.id);
        if (deleteErr) throw deleteErr;
        for (const it of form.items) {
          const { error: itemErr } = await supabase.from("order_items").insert({
            order_id: editingOrder.id,
            product_id: it.product_id,
            quantity: it.quantity,
            unit_price: it.unit_price,
          });
          if (itemErr) throw itemErr;
        }
        const { data: updatedOrder, error: fetchErr } = await supabase
          .from("orders")
          .select(`
            *,
            customer:customers(id, name),
            order_items(*, product:products(id, name))
          `)
          .eq("id", editingOrder.id)
          .single();
        if (fetchErr) throw fetchErr;
        setOrders((prev) =>
          prev.map((o) => (o.id === editingOrder.id ? updatedOrder : o))
        );
        setOpen(false);
        resetForm();
        toast.success("Order updated");
      } else {
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .insert({
            customer_id: form.customer_id,
            delivery_date: form.delivery_date,
            payment_type: form.payment_type || "on_delivery",
            credit_days: form.credit_days,
            status: "pending",
            created_by: currentUserId,
          })
          .select()
          .single();
        if (orderErr) throw orderErr;
        for (const it of form.items) {
          const { error: itemErr } = await supabase.from("order_items").insert({
            order_id: order.id,
            product_id: it.product_id,
            quantity: it.quantity,
            unit_price: it.unit_price,
          });
          if (itemErr) throw itemErr;
        }
        const { data: fullOrder, error: fetchErr } = await supabase
          .from("orders")
          .select(`
            *,
            customer:customers(id, name),
            order_items(*, product:products(id, name))
          `)
          .eq("id", order.id)
          .single();
        if (fetchErr) throw fetchErr;
        setOrders((prev) => [fullOrder, ...prev]);
        setOpen(false);
        resetForm();
        toast.success("Order created");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save order");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    setLoading(true);
    try {
      const { data: existingSale } = await supabase
        .from("sales")
        .select("id")
        .eq("order_id", orderToDelete.id)
        .limit(1)
        .single();
      if (existingSale) {
        toast.error("Cannot delete: order has been sold. Delete the sale first.");
        setLoading(false);
        return;
      }
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderToDelete.id);
      if (error) throw error;
      setOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id));
      setDeleteOrderOpen(false);
      setOrderToDelete(null);
      toast.success("Order deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete order");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);
      if (error) throw error;
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
      toast.success("Status updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500",
    processing: "bg-blue-500",
    delivered: "bg-green-500",
    cancelled: "bg-slate-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog
          open={open}
          onOpenChange={(o) => {
            if (!o) resetForm();
            setOpen(o);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setEditingOrder(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingOrder ? "Edit Order" : "Create Order"}</DialogTitle>
              <DialogDescription>
                {editingOrder
                  ? "Update the order details below."
                  : "Select customer, add products, set delivery date. Prices are pre-filled from customer pricing."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Select
                    value={form.customer_id}
                    onValueChange={onCustomerChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Delivery date</Label>
                  <Input
                    type="date"
                    value={form.delivery_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, delivery_date: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment type</Label>
                  <Select
                    value={form.payment_type || "on_delivery"}
                    onValueChange={(v: "on_delivery" | "credit") =>
                      setForm((f) => ({ ...f, payment_type: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_delivery">On delivery</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.payment_type === "credit" && (
                  <div className="space-y-2">
                    <Label>Credit days</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.credit_days || ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          credit_days: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Order items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {form.items.map((it, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Select
                        value={it.product_id}
                        onValueChange={(v) => updateItem(idx, "product_id", v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={0.01}
                        step="any"
                        placeholder="Qty"
                        className="w-20"
                        value={it.quantity || ""}
                        onChange={(e) =>
                          updateItem(idx, "quantity", parseFloat(e.target.value) || 0)
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="Price"
                        className="w-24"
                        value={it.unit_price || ""}
                        onChange={(e) =>
                          updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                {form.items.length > 0 && (
                  <p className="text-sm font-medium">
                    Total: ETB {totalAmount.toFixed(2)}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading || form.items.length === 0}>
                  {loading ? "Saving..." : editingOrder ? "Update order" : "Create order"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={deleteOrderOpen} onOpenChange={setDeleteOrderOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete order</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this order? This cannot be undone. Orders that have been sold cannot be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOrderOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteOrder}
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
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Orders
          </CardTitle>
          <CardDescription>All orders with delivery dates</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Delivery date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o, index) => {
                const items = o.order_items || [];
                const total = items.reduce(
                  (s, i) => s + i.quantity * i.unit_price,
                  0
                );
                return (
                  <TableRow key={o.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {(o.customer as { name?: string })?.name || "—"}
                    </TableCell>
                    <TableCell>{format(new Date(o.delivery_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Select
                        value={o.status}
                        onValueChange={(v) => handleStatusChange(o.id, v)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {items.map((i) => (i.product as { name?: string })?.name).join(", ")}
                    </TableCell>
                    <TableCell>ETB {total.toFixed(2)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(o)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={`/sales?order=${o.id}`}>
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              Record sale
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => {
                              setOrderToDelete(o);
                              setTimeout(() => setDeleteOrderOpen(true), 0);
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
