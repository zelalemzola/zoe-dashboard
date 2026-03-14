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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Package, History, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Product, Restock } from "@/lib/types/database";

interface InventoryClientProps {
  products: Product[];
  restocks: (Restock & { product?: Product; provider?: { id: string; name: string } })[];
  providers: { id: string; name: string; payment_type?: string; credit_days?: number }[];
  currentUserId: string;
}

export function InventoryClient({
  products: initialProducts,
  restocks,
  providers,
  currentUserId,
}: InventoryClientProps) {
  const [products, setProducts] = useState(initialProducts);
  const [openProduct, setOpenProduct] = useState(false);
  const [openRestock, setOpenRestock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productForm, setProductForm] = useState({ name: "", unit: "kg" });
  const [restockForm, setRestockForm] = useState({
    provider_id: "",
    product_id: "",
    quantity: 0,
    unit_price: 0,
    restock_date: format(new Date(), "yyyy-MM-dd"),
    payment_type: "on_delivery" as "on_delivery" | "credit",
    credit_days: 0,
  });

  const supabase = createClient();

  const getProviderPrice = async (providerId: string, productId: string) => {
    const { data } = await supabase
      .from("provider_prices")
      .select("price")
      .eq("provider_id", providerId)
      .eq("product_id", productId)
      .single();
    return data?.price;
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .insert({ name: productForm.name, unit: productForm.unit })
        .select()
        .single();
      if (error) throw error;
      setProducts((prev) => [...prev, data]);
      setOpenProduct(false);
      setProductForm({ name: "", unit: "kg" });
      toast.success("Product added");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockForm.provider_id || !restockForm.product_id || restockForm.quantity <= 0) {
      toast.error("Fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const provider = providers.find((p) => p.id === restockForm.provider_id);
      const isCredit = provider?.payment_type === "credit" || restockForm.payment_type === "credit";
      const creditDays = isCredit ? (restockForm.credit_days || provider?.credit_days || 0) : 0;
      let creditDueDate: string | null = null;
      if (isCredit && creditDays > 0) {
        const d = new Date(restockForm.restock_date);
        d.setDate(d.getDate() + creditDays);
        creditDueDate = format(d, "yyyy-MM-dd");
      }
      const { error } = await supabase.from("restocks").insert({
        provider_id: restockForm.provider_id,
        product_id: restockForm.product_id,
        quantity: restockForm.quantity,
        unit_price: restockForm.unit_price,
        restock_date: restockForm.restock_date,
        is_paid: !isCredit,
        credit_due_date: creditDueDate,
        created_by: currentUserId,
      });
      if (error) throw error;
      const product = products.find((p) => p.id === restockForm.product_id);
      if (product) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === restockForm.product_id
              ? { ...p, quantity: p.quantity + restockForm.quantity }
              : p
          )
        );
      }
      setOpenRestock(false);
      setRestockForm({
        provider_id: "",
        product_id: "",
        quantity: 0,
        unit_price: 0,
        restock_date: format(new Date(), "yyyy-MM-dd"),
        payment_type: "on_delivery",
        credit_days: 0,
      });
      toast.success("Restock recorded");
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record restock");
    } finally {
      setLoading(false);
    }
  };

  const onProviderChange = async (providerId: string) => {
    setRestockForm((f) => ({ ...f, provider_id: providerId }));
    if (restockForm.product_id) {
      const price = await getProviderPrice(providerId, restockForm.product_id);
      if (price) setRestockForm((f) => ({ ...f, unit_price: Number(price) }));
    }
  };

  const onProductChange = async (productId: string) => {
    setRestockForm((f) => ({ ...f, product_id: productId }));
    if (restockForm.provider_id) {
      const price = await getProviderPrice(restockForm.provider_id, productId);
      if (price) setRestockForm((f) => ({ ...f, unit_price: Number(price) }));
    }
  };

  const lowStockThreshold = 10;
  const lowStockProducts = products.filter((p) => p.quantity < lowStockThreshold);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Dialog open={openProduct} onOpenChange={setOpenProduct}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Product</DialogTitle>
              <DialogDescription>Register a new product for your inventory</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="space-y-2">
                <Label>Product name</Label>
                <Input
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select
                  value={productForm.unit}
                  onValueChange={(v) =>
                    setProductForm((f) => ({ ...f, unit: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="pcs">pcs</SelectItem>
                    <SelectItem value="box">box</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={openRestock} onOpenChange={setOpenRestock}>
          <DialogTrigger asChild>
            <Button>
              <Package className="mr-2 h-4 w-4" />
              Record Restock
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Restock</DialogTitle>
              <DialogDescription>
                Select provider and product. Price will be pre-filled if set.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRestock} className="space-y-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={restockForm.provider_id}
                  onValueChange={onProviderChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Product</Label>
                <Select
                  value={restockForm.product_id}
                  onValueChange={onProductChange}
                  required
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={0.01}
                    step="any"
                    value={restockForm.quantity || ""}
                    onChange={(e) =>
                      setRestockForm((f) => ({
                        ...f,
                        quantity: parseFloat(e.target.value) || 0,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit price (ETB)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={restockForm.unit_price || ""}
                    onChange={(e) =>
                      setRestockForm((f) => ({
                        ...f,
                        unit_price: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Restock date</Label>
                <Input
                  type="date"
                  value={restockForm.restock_date}
                  onChange={(e) =>
                    setRestockForm((f) => ({ ...f, restock_date: e.target.value }))
                  }
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Record"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {lowStockProducts.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>These products are running low</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map((p) => (
                <Badge key={p.id} variant="destructive">
                  {p.name}: {p.quantity} {p.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Current Stock</TabsTrigger>
          <TabsTrigger value="history">Restock History</TabsTrigger>
        </TabsList>
        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>Current inventory levels</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.quantity}</TableCell>
                      <TableCell>{p.unit}</TableCell>
                      <TableCell>
                        {p.quantity < lowStockThreshold ? (
                          <Badge variant="destructive">Low</Badge>
                        ) : (
                          <Badge variant="secondary">In stock</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Restock History</CardTitle>
              <CardDescription>Recent inventory restocks</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restocks.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{format(new Date(r.restock_date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{(r.product as Product)?.name || "—"}</TableCell>
                      <TableCell>{(r.provider as { name?: string })?.name || "—"}</TableCell>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell>ETB {Number(r.unit_price).toFixed(2)}</TableCell>
                      <TableCell>
                        ETB {(r.quantity * Number(r.unit_price)).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.is_paid ? "secondary" : "outline"}>
                          {r.is_paid ? "Yes" : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
