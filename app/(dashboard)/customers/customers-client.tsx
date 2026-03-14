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
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Users, DollarSign, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Customer, CustomerPrice, Product } from "@/lib/types/database";

interface CustomersClientProps {
  customers: Customer[];
  customerPrices: (CustomerPrice & { product?: Product })[];
  products: { id: string; name: string }[];
  sales: { customer_id: string; sale_date: string; total_amount: number }[];
}

export function CustomersClient({
  customers: initialCustomers,
  customerPrices,
  products,
  sales,
}: CustomersClientProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [open, setOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [priceOpen, setPriceOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contact: "",
    address: "",
    payment_type: "on_delivery" as "on_delivery" | "credit",
    credit_days: 0,
  });
  const [priceForm, setPriceForm] = useState({ product_id: "", price: 0 });

  const supabase = createClient();

  const getLastOrder = (customerId: string) => {
    const s = sales.find((x) => x.customer_id === customerId);
    return s ? new Date(s.sale_date).toLocaleDateString() : "—";
  };

  const getCustomerPrices = (customerId: string) =>
    customerPrices.filter((cp) => cp.customer_id === customerId);

  const resetForm = () => {
    setForm({ name: "", contact: "", address: "", payment_type: "on_delivery", credit_days: 0 });
    setEditingCustomer(null);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      contact: customer.contact || "",
      address: customer.address || "",
      payment_type: customer.payment_type,
      credit_days: customer.credit_days,
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingCustomer) {
        const { data, error } = await supabase
          .from("customers")
          .update(form)
          .eq("id", editingCustomer.id)
          .select()
          .single();
        if (error) throw error;
        setCustomers((prev) => prev.map((c) => (c.id === editingCustomer.id ? data : c)));
        setOpen(false);
        resetForm();
        toast.success("Customer updated");
      } else {
        const { data, error } = await supabase
          .from("customers")
          .insert(form)
          .select()
          .single();
        if (error) throw error;
        setCustomers((prev) => [...prev, data]);
        setOpen(false);
        resetForm();
        toast.success("Customer added");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save customer");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("customers").delete().eq("id", customerToDelete.id);
      if (error) throw error;
      setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete.id));
      setDeleteOpen(false);
      setCustomerToDelete(null);
      toast.success("Customer deleted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      if (typeof msg === "string" && msg.includes("foreign key")) {
        toast.error("Cannot delete: customer has orders or sales. Remove those first.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceOpen || !priceForm.product_id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("customer_prices").upsert(
        {
          customer_id: priceOpen,
          product_id: priceForm.product_id,
          price: priceForm.price,
        },
        { onConflict: "customer_id,product_id" }
      );
      if (error) throw error;
      setPriceOpen(null);
      setPriceForm({ product_id: "", price: 0 });
      toast.success("Price updated");
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save price");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Total customers: {customers.length}
      </p>
      <div className="flex justify-end">
        <Dialog
          open={open}
          onOpenChange={(o) => {
            if (!o) resetForm();
            setOpen(o);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCustomer(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
              <DialogDescription>
                {editingCustomer
                  ? "Update the customer details below."
                  : "Register a new customer. Set payment type and credit days if they work on credit."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input
                  value={form.contact}
                  onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment type</Label>
                  <Select
                    value={form.payment_type}
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
                        setForm((f) => ({ ...f, credit_days: parseInt(e.target.value) || 0 }))
                      }
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editingCustomer ? "Update" : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete customer</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {customerToDelete?.name}? This cannot be undone.
                Customers with existing orders or sales cannot be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
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
            <Users className="h-5 w-5" />
            All Customers
          </CardTitle>
          <CardDescription>Customer list with last order and pricing</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Last order</TableHead>
                <TableHead>Custom prices</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c, index) => {
                const prices = getCustomerPrices(c.id);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.contact || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.payment_type === "credit" ? "secondary" : "outline"}>
                        {c.payment_type === "credit"
                          ? `Credit (${c.credit_days} days)`
                          : "On delivery"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getLastOrder(c.id)}</TableCell>
                    <TableCell>
                      {prices.length > 0 ? (
                        <span className="text-sm">
                          {prices.length} product(s)
                        </span>
                      ) : (
                        "—"
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
                          <DropdownMenuItem onClick={() => handleOpenEdit(c)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPriceOpen(c.id)}>
                            <DollarSign className="mr-2 h-4 w-4" />
                            Prices
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setCustomerToDelete(c);
                              setDeleteOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Dialog
                        open={priceOpen === c.id}
                        onOpenChange={(o) => !o && setPriceOpen(null)}
                      >
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Custom prices for {c.name}</DialogTitle>
                            <DialogDescription>
                              Set product-specific prices for this customer
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleAddPrice} className="space-y-4">
                            <div className="space-y-2">
                              <Label>Product</Label>
                              <Select
                                value={priceForm.product_id}
                                onValueChange={(v) =>
                                  setPriceForm((f) => ({ ...f, product_id: v }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Price (ETB)</Label>
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                value={priceForm.price || ""}
                                onChange={(e) =>
                                  setPriceForm((f) => ({
                                    ...f,
                                    price: parseFloat(e.target.value) || 0,
                                  }))
                                }
                              />
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Current prices:{" "}
                              {prices.length
                                ? prices
                                    .map(
                                      (p) =>
                                        `${(p.product as Product)?.name}: ETB ${p.price}`
                                    )
                                    .join(", ")
                                : "None"}
                            </div>
                            <DialogFooter>
                              <Button type="submit" disabled={loading}>
                                {loading ? "Saving..." : "Save"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
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
