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
import { Plus, Truck, DollarSign } from "lucide-react";
import { toast } from "sonner";
import type { Provider, ProviderPrice, Product } from "@/lib/types/database";

export function ProvidersClient({
  providers: initialProviders,
  providerPrices,
  products,
}: {
  providers: Provider[];
  providerPrices: (ProviderPrice & { product?: Product })[];
  products: { id: string; name: string }[];
}) {
  const [providers, setProviders] = useState(initialProviders);
  const [open, setOpen] = useState(false);
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

  const getProviderPrices = (providerId: string) =>
    providerPrices.filter((pp) => pp.provider_id === providerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("providers")
        .insert(form)
        .select()
        .single();
      if (error) throw error;
      setProviders((prev) => [...prev, data]);
      setOpen(false);
      setForm({
        name: "",
        contact: "",
        address: "",
        payment_type: "on_delivery",
        credit_days: 0,
      });
      toast.success("Provider added");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add provider");
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
        },
        { onConflict: "provider_id,product_id" }
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
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Provider</DialogTitle>
              <DialogDescription>
                Register a product provider. Set payment type and credit days if they offer credit.
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
                  {loading ? "Adding..." : "Add"}
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
                      <Dialog
                        open={priceOpen === p.id}
                        onOpenChange={(o) => !o && setPriceOpen(null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPriceOpen(p.id)}
                          >
                            <DollarSign className="mr-1 h-4 w-4" />
                            Prices
                          </Button>
                        </DialogTrigger>
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
                                onValueChange={(v) =>
                                  setPriceForm((f) => ({ ...f, product_id: v }))
                                }
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
                              Current:{" "}
                              {prices.length
                                ? prices
                                    .map(
                                      (pr) =>
                                        `${(pr.product as Product)?.name}: ETB ${pr.price}`
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
