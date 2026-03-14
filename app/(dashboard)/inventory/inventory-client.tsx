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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Package, AlertTriangle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Product, Restock } from "@/lib/types/database";

type RestockRow = Restock & { product?: Product; provider?: { id: string; name: string } };

interface InventoryClientProps {
  products: Product[];
  restocks: RestockRow[];
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
  const [restocksList, setRestocksList] = useState<RestockRow[]>(restocks);
  const [openProduct, setOpenProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [openRestock, setOpenRestock] = useState(false);
  const [editingRestock, setEditingRestock] = useState<RestockRow | null>(null);
  const [deleteRestockOpen, setDeleteRestockOpen] = useState(false);
  const [restockToDelete, setRestockToDelete] = useState<RestockRow | null>(null);
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
    is_paid: false,
  });

  const supabase = createClient();

  const getProviderPrice = async (
    providerId: string,
    productId: string,
    quantity?: number
  ): Promise<number | null> => {
    const { data } = await supabase
      .from("provider_prices")
      .select("price, bulk_price, bulk_min_quantity")
      .eq("provider_id", providerId)
      .eq("product_id", productId)
      .single();
    if (!data) return null;
    const qty = quantity ?? 0;
    const bulkMin = Number(data.bulk_min_quantity ?? 0);
    const bulkPrice = data.bulk_price != null ? Number(data.bulk_price) : null;
    if (bulkPrice != null && bulkMin > 0 && qty >= bulkMin) {
      return bulkPrice;
    }
    return Number(data.price);
  };

  const resetProductForm = () => {
    setProductForm({ name: "", unit: "kg" });
    setEditingProduct(null);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({ name: product.name, unit: product.unit });
    setOpenProduct(true);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingProduct) {
        const { data, error } = await supabase
          .from("products")
          .update({ name: productForm.name, unit: productForm.unit })
          .eq("id", editingProduct.id)
          .select()
          .single();
        if (error) throw error;
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? data : p))
        );
        setOpenProduct(false);
        resetProductForm();
        toast.success("Product updated");
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert({ name: productForm.name, unit: productForm.unit })
          .select()
          .single();
        if (error) throw error;
        setProducts((prev) => [...prev, data]);
        setOpenProduct(false);
        resetProductForm();
        toast.success("Product added");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productToDelete.id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      setDeleteOpen(false);
      setProductToDelete(null);
      toast.success("Product deleted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete";
      if (typeof msg === "string" && msg.includes("foreign key")) {
        toast.error("Cannot delete: product is used in orders or sales. Remove those first.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const RESTOCK_WITHHOLDING_THRESHOLD = 20_000;

  const resetRestockForm = () => {
    setRestockForm({
      provider_id: "",
      product_id: "",
      quantity: 0,
      unit_price: 0,
      restock_date: format(new Date(), "yyyy-MM-dd"),
      payment_type: "on_delivery",
      credit_days: 0,
      is_paid: false,
    });
    setEditingRestock(null);
  };

  const handleOpenEditRestock = (r: RestockRow) => {
    setEditingRestock(r);
    setRestockForm({
      provider_id: r.provider_id,
      product_id: r.product_id,
      quantity: Number(r.quantity),
      unit_price: Number(r.unit_price),
      restock_date: r.restock_date,
      payment_type: "on_delivery",
      credit_days: 0,
      is_paid: r.is_paid ?? false,
    });
    setOpenRestock(true);
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockForm.provider_id || !restockForm.product_id || restockForm.quantity <= 0) {
      toast.error("Fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const total = restockForm.quantity * restockForm.unit_price;
      const withholdingAmount =
        total >= RESTOCK_WITHHOLDING_THRESHOLD ? (total / 1.15) * 0.03 : null;
      const provider = providers.find((p) => p.id === restockForm.provider_id);
      const isCredit = provider?.payment_type === "credit" || restockForm.payment_type === "credit";
      const creditDays = isCredit ? (restockForm.credit_days || provider?.credit_days || 0) : 0;
      let creditDueDate: string | null = null;
      if (isCredit && creditDays > 0) {
        const d = new Date(restockForm.restock_date);
        d.setDate(d.getDate() + creditDays);
        creditDueDate = format(d, "yyyy-MM-dd");
      }
      const isPaid = editingRestock ? restockForm.is_paid : !isCredit;

      if (editingRestock) {
        const oldQty = Number(editingRestock.quantity);
        const newQty = restockForm.quantity;
        const oldProductId = editingRestock.product_id;
        const newProductId = restockForm.product_id;
        const oldProductRow = products.find((p) => p.id === oldProductId);
        const newProductRow = products.find((p) => p.id === newProductId);

        if (oldProductId !== newProductId) {
          const oldProductQty = oldProductRow?.quantity ?? 0;
          if (oldProductQty < oldQty) {
            toast.error("Cannot change product: current stock would go negative");
            setLoading(false);
            return;
          }
        } else {
          const currentQty = newProductRow?.quantity ?? 0;
          const delta = newQty - oldQty;
          if (currentQty + delta < 0) {
            toast.error("Cannot reduce quantity: product stock would go negative");
            setLoading(false);
            return;
          }
        }

        const { data: updated, error } = await supabase
          .from("restocks")
          .update({
            provider_id: restockForm.provider_id,
            product_id: newProductId,
            quantity: newQty,
            unit_price: restockForm.unit_price,
            restock_date: restockForm.restock_date,
            withholding_amount: withholdingAmount,
            is_paid: isPaid,
            credit_due_date: creditDueDate,
          })
          .eq("id", editingRestock.id)
          .select()
          .single();
        if (error) throw error;

        const updatedRestock: RestockRow = { ...updated, product: newProductRow, provider };

        if (oldProductId !== newProductId) {
          const oldProductQty = oldProductRow?.quantity ?? 0;
          const newProductQty = newProductRow?.quantity ?? 0;
          const { error: errOld } = await supabase
            .from("products")
            .update({ quantity: oldProductQty - oldQty })
            .eq("id", oldProductId);
          if (errOld) throw errOld;
          const { error: errNew } = await supabase
            .from("products")
            .update({ quantity: newProductQty + newQty })
            .eq("id", newProductId);
          if (errNew) throw errNew;
          setProducts((prev) =>
            prev.map((p) => {
              if (p.id === oldProductId) return { ...p, quantity: oldProductQty - oldQty };
              if (p.id === newProductId) return { ...p, quantity: newProductQty + newQty };
              return p;
            })
          );
        } else {
          const delta = newQty - oldQty;
          const newQtyVal = (newProductRow?.quantity ?? 0) + delta;
          const { error: errProd } = await supabase
            .from("products")
            .update({ quantity: newQtyVal })
            .eq("id", newProductId);
          if (errProd) throw errProd;
          setProducts((prev) =>
            prev.map((p) =>
              p.id === newProductId ? { ...p, quantity: newQtyVal } : p
            )
          );
        }

        setRestocksList((prev) =>
          prev.map((r) => (r.id === editingRestock.id ? updatedRestock : r))
        );
        setOpenRestock(false);
        resetRestockForm();
        toast.success("Restock updated");
      } else {
        const { error } = await supabase.from("restocks").insert({
          provider_id: restockForm.provider_id,
          product_id: restockForm.product_id,
          quantity: restockForm.quantity,
          unit_price: restockForm.unit_price,
          restock_date: restockForm.restock_date,
          withholding_amount: withholdingAmount,
          is_paid: isPaid,
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
        resetRestockForm();
        toast.success("Restock recorded");
        window.location.reload();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save restock");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRestock = async () => {
    if (!restockToDelete) return;
    setLoading(true);
    try {
      const productRow = products.find((p) => p.id === restockToDelete.product_id);
      const currentQty = Number(productRow?.quantity ?? 0);
      const restockQty = Number(restockToDelete.quantity);
      const newQty = Math.max(0, currentQty - restockQty);
      const { error: errProd } = await supabase
        .from("products")
        .update({ quantity: newQty })
        .eq("id", restockToDelete.product_id);
      if (errProd) throw errProd;
      const { error: errRestock } = await supabase
        .from("restocks")
        .delete()
        .eq("id", restockToDelete.id);
      if (errRestock) throw errRestock;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === restockToDelete.product_id
            ? { ...p, quantity: newQty }
            : p
        )
      );
      setRestocksList((prev) => prev.filter((r) => r.id !== restockToDelete.id));
      setDeleteRestockOpen(false);
      setRestockToDelete(null);
      toast.success("Restock deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete restock");
    } finally {
      setLoading(false);
    }
  };

  const onProviderChange = async (providerId: string) => {
    setRestockForm((f) => ({ ...f, provider_id: providerId }));
    if (restockForm.product_id) {
      const price = await getProviderPrice(
        providerId,
        restockForm.product_id,
        restockForm.quantity
      );
      if (price != null)
        setRestockForm((f) => ({ ...f, unit_price: Number(price) }));
    }
  };

  const onProductChange = async (productId: string) => {
    setRestockForm((f) => ({ ...f, product_id: productId }));
    if (restockForm.provider_id) {
      const price = await getProviderPrice(
        restockForm.provider_id,
        productId,
        restockForm.quantity
      );
      if (price != null)
        setRestockForm((f) => ({ ...f, unit_price: Number(price) }));
    }
  };

  const onQuantityChange = async (quantity: number) => {
    if (restockForm.provider_id && restockForm.product_id) {
      const price = await getProviderPrice(
        restockForm.provider_id,
        restockForm.product_id,
        quantity
      );
      setRestockForm((f) => ({
        ...f,
        quantity,
        unit_price: price != null ? Number(price) : f.unit_price,
      }));
    } else {
      setRestockForm((f) => ({ ...f, quantity }));
    }
  };

  const lowStockThreshold = 10;
  const lowStockProducts = products.filter((p) => p.quantity < lowStockThreshold);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Dialog
          open={openProduct}
          onOpenChange={(o) => {
            if (!o) resetProductForm();
            setOpenProduct(o);
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? "Update the product details below."
                  : "Register a new product for your inventory"}
              </DialogDescription>
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
                  {loading ? "Saving..." : editingProduct ? "Update" : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete product</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {productToDelete?.name}? This cannot be undone.
                Products used in orders or sales cannot be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteProduct}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={openRestock}
          onOpenChange={(o) => {
            setOpenRestock(o);
            if (!o) resetRestockForm();
          }}
        >
          <Button
            onClick={() => {
              resetRestockForm();
              setOpenRestock(true);
            }}
          >
            <Package className="mr-2 h-4 w-4" />
            Record Restock
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRestock ? "Edit Restock" : "Record Restock"}</DialogTitle>
              <DialogDescription>
                {editingRestock
                  ? "Update the restock details below."
                  : "Select provider and product. Price will be pre-filled if set."}
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
                      onQuantityChange(parseFloat(e.target.value) || 0)
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
              {editingRestock && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="restock-is-paid"
                    checked={restockForm.is_paid}
                    onCheckedChange={(checked) =>
                      setRestockForm((f) => ({ ...f, is_paid: !!checked }))
                    }
                  />
                  <Label htmlFor="restock-is-paid">Mark as paid</Label>
                </div>
              )}
              {restockForm.quantity * restockForm.unit_price >= RESTOCK_WITHHOLDING_THRESHOLD && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                  <p className="font-medium text-primary">Withholding applies (≥ ETB 20,000)</p>
                  <p className="mt-1 text-muted-foreground">
                    Total: ETB {(restockForm.quantity * restockForm.unit_price).toFixed(2)} → Withhold: ETB{" "}
                    {((restockForm.quantity * restockForm.unit_price) / 1.15 * 0.03).toFixed(2)} → Send to provider: ETB{" "}
                    {((restockForm.quantity * restockForm.unit_price) - (restockForm.quantity * restockForm.unit_price) / 1.15 * 0.03).toFixed(2)}
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editingRestock ? "Update" : "Record"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={deleteRestockOpen} onOpenChange={setDeleteRestockOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete restock</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this restock? This will reverse the inventory and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteRestockOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteRestock}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
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
                    <TableHead className="w-12">Actions</TableHead>
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
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => handleOpenEditProduct(p)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => {
                                setProductToDelete(p);
                                setTimeout(() => setDeleteOpen(true), 0);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restocksList.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{format(new Date(r.restock_date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{(r.product as Product)?.name || "—"}</TableCell>
                      <TableCell>{(r.provider as { name?: string })?.name || "—"}</TableCell>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell>ETB {Number(r.unit_price).toFixed(2)}</TableCell>
                      <TableCell>
                        ETB {(r.quantity * Number(r.unit_price)).toFixed(2)}
                        {r.withholding_amount && Number(r.withholding_amount) > 0 && (
                          <span className="block text-xs text-muted-foreground">
                            Sent: ETB {(r.quantity * Number(r.unit_price) - Number(r.withholding_amount)).toFixed(2)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.is_paid ? "secondary" : "outline"}>
                          {r.is_paid ? "Yes" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditRestock(r)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => {
                                setRestockToDelete(r);
                                setTimeout(() => setDeleteRestockOpen(true), 0);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
