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
import { Plus, Truck, DollarSign, MoreHorizontal, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Provider, ProviderPrice, Product } from "@/lib/types/database";

export function ProvidersClient({
  providers: initialProviders,
  providerPrices,
  products,
}: {
  providers: Provider[];
  providerPrices: (ProviderPrice & { product?: Product })[];
  products: { id: string; name: string; unit?: string }[];
}) {
  const [providers, setProviders] = useState(initialProviders);
  const [open, setOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [priceOpen, setPriceOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contact: "",
    address: "",
    payment_type: "on_delivery" as "on_delivery" | "credit",
    credit_days: 0,
  });
  const [priceForm, setPriceForm] = useState({
    product_id: "",
    price: 0,
    bulk_price: 0,
    bulk_min_quantity: 0,
  });

  const supabase = createClient();

  const getProviderPrices = (providerId: string) =>
    providerPrices.filter((pp) => pp.provider_id === providerId);

  const resetForm = () => {
    setForm({
      name: "",
      contact: "",
      address: "",
      payment_type: "on_delivery",
      credit_days: 0,
    });
    setEditingProvider(null);
  };

  const handleOpenEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setForm({
      name: provider.name,
      contact: provider.contact || "",
      address: provider.address || "",
      payment_type: provider.payment_type,
      credit_days: provider.credit_days,
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingProvider) {
        const { data, error } = await supabase
          .from("providers")
          .update(form)
          .eq("id", editingProvider.id)
          .select()
          .single();
        if (error) throw error;
        setProviders((prev) =>
          prev.map((p) => (p.id === editingProvider.id ? data : p))
        );
        setOpen(false);
        resetForm();
        toast.success("Provider updated");
      } else {
        const { data, error } = await supabase
          .from("providers")
          .insert(form)
          .select()
          .single();
        if (error) throw error;
        setProviders((prev) => [...prev, data]);
        setOpen(false);
        resetForm();
        toast.success("Provider added");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save provider");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceOpen || !priceForm.product_id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("provider_prices").upsert(
        {
          provider_id: priceOpen,
          product_id: priceForm.product_id,
          price: priceForm.price,
          bulk_price: priceForm.bulk_price > 0 ? priceForm.bulk_price : null,
          bulk_min_quantity: priceForm.bulk_min_quantity > 0 ? priceForm.bulk_min_quantity : null,
        },
        { onConflict: "provider_id,product_id" }
      );
      if (error) throw error;
      setPriceOpen(null);
      setPriceForm({ product_id: "", price: 0, bulk_price: 0, bulk_min_quantity: 0 });
      toast.success("Price updated");
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save price");
    } finally {
      setLoading(false);
    }
  };

  const onPriceProductChange = (productId: string) => {
    if (!priceOpen) return;
    const existing = providerPrices.find(
      (pp) => pp.provider_id === priceOpen && pp.product_id === productId
    );
    setPriceForm((f) => ({
      ...f,
      product_id: productId,
      price: existing ? Number(existing.price) : 0,
      bulk_price: existing?.bulk_price ? Number(existing.bulk_price) : 0,
      bulk_min_quantity: existing?.bulk_min_quantity ? Number(existing.bulk_min_quantity) : 0,
    }));
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
            <Button onClick={() => setEditingProvider(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProvider ? "Edit Provider" : "Add Provider"}</DialogTitle>
              <DialogDescription>
                {editingProvider
                  ? "Update the provider details below."
                  : "Register a product provider. Set payment type and credit days if they offer credit."}
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
                        setForm((f) => ({
                          ...f,
                          credit_days: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editingProvider ? "Update" : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Providers
          </CardTitle>
          <CardDescription>Provider list with product pricing</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Product prices</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((p) => {
                const prices = getProviderPrices(p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.contact || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.payment_type === "credit" ? "secondary" : "outline"}>
                        {p.payment_type === "credit"
                          ? `Credit (${p.credit_days} days)`
                          : "On delivery"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {prices.length > 0 ? (
                        <span className="text-sm">{prices.length} product(s)</span>
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
                          <DropdownMenuItem onSelect={() => handleOpenEdit(p)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setPriceForm({
                                product_id: "",
                                price: 0,
                                bulk_price: 0,
                                bulk_min_quantity: 0,
                              });
                              setTimeout(() => setPriceOpen(p.id), 0);
                            }}
                          >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Prices
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Dialog
                        open={priceOpen === p.id}
                        onOpenChange={(o) => !o && setPriceOpen(null)}
                      >
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Product prices for {p.name}</DialogTitle>
                            <DialogDescription>
                              Set prices for each product. These pre-fill when restocking.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleAddPrice} className="space-y-4">
                            <div className="space-y-2">
                              <Label>Product</Label>
                              <Select
                                value={priceForm.product_id}
                                onValueChange={onPriceProductChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((pr) => (
                                    <SelectItem key={pr.id} value={pr.id}>
                                      {pr.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Normal price (ETB per unit)</Label>
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                placeholder="Regular price"
                                value={priceForm.price || ""}
                                onChange={(e) =>
                                  setPriceForm((f) => ({
                                    ...f,
                                    price: parseFloat(e.target.value) || 0,
                                  }))
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Used when quantity is below the bulk threshold
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>Bulk price (ETB per unit)</Label>
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                placeholder="Optional"
                                value={priceForm.bulk_price || ""}
                                onChange={(e) =>
                                  setPriceForm((f) => ({
                                    ...f,
                                    bulk_price: parseFloat(e.target.value) || 0,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Bulk threshold (min quantity)</Label>
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                placeholder="e.g. 100"
                                value={priceForm.bulk_min_quantity || ""}
                                onChange={(e) =>
                                  setPriceForm((f) => ({
                                    ...f,
                                    bulk_min_quantity: parseFloat(e.target.value) || 0,
                                  }))
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                When restock quantity ≥ this amount, bulk price is used instead of normal price. Leave 0 to always use normal price.
                              </p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Current:{" "}
                              {prices.length
                                ? prices
                                    .map((pr) => {
                                      const prod = pr.product as Product & { unit?: string };
                                      const unit = prod?.unit || "";
                                      let s = `${prod?.name}: ETB ${pr.price}/unit`;
                                      if (pr.bulk_price && pr.bulk_min_quantity) {
                                        s += `; bulk ETB ${pr.bulk_price}/unit (≥${pr.bulk_min_quantity} ${unit})`;
                                      }
                                      return s;
                                    })
                                    .join(" | ")
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
