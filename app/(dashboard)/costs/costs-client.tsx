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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Wallet } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Cost } from "@/lib/types/database";

export function CostsClient({
  costs: initialCosts,
  currentUserId,
}: {
  costs: Cost[];
  currentUserId: string;
}) {
  const [costs, setCosts] = useState(initialCosts);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: 0,
    type: "one_time" as "recurring" | "one_time",
    category: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    recurring_frequency: null as "daily" | "weekly" | "monthly" | "yearly" | null,
  });

  const supabase = createClient();

  const recurringCosts = costs.filter((c) => c.type === "recurring");
  const oneTimeCosts = costs.filter((c) => c.type === "one_time");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("costs")
        .insert({
          amount: form.amount,
          type: form.type,
          category: form.category,
          description: form.description || null,
          date: form.date,
          recurring_frequency: form.type === "recurring" ? form.recurring_frequency : null,
          created_by: currentUserId,
        })
        .select()
        .single();
      if (error) throw error;
      setCosts((prev) => [data, ...prev]);
      setOpen(false);
      setForm({
        amount: 0,
        type: "one_time",
        category: "",
        description: "",
        date: format(new Date(), "yyyy-MM-dd"),
        recurring_frequency: null,
      });
      toast.success("Cost recorded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add cost");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("costs").delete().eq("id", id);
      if (error) throw error;
      setCosts((prev) => prev.filter((c) => c.id !== id));
      toast.success("Cost removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Cost
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Cost</DialogTitle>
              <DialogDescription>
                Add recurring (rent, utilities) or one-time (taxes, purchases) costs
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: "recurring" | "one_time") =>
                    setForm((f) => ({ ...f, type: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Rent, Taxes, Supplies"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (ETB)</Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={form.amount || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              {form.type === "recurring" && (
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={form.recurring_frequency || ""}
                    onValueChange={(v: "daily" | "weekly" | "monthly" | "yearly") =>
                      setForm((f) => ({ ...f, recurring_frequency: v || null }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All costs</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
          <TabsTrigger value="onetime">One-time</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <CostTable costs={costs} onDelete={handleDelete} />
        </TabsContent>
        <TabsContent value="recurring" className="mt-4">
          <CostTable costs={recurringCosts} onDelete={handleDelete} />
        </TabsContent>
        <TabsContent value="onetime" className="mt-4">
          <CostTable costs={oneTimeCosts} onDelete={handleDelete} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CostTable({
  costs,
  onDelete,
}: {
  costs: Cost[];
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Costs
        </CardTitle>
        <CardDescription>
          Total: ETB{" "}
          {costs.reduce((s, c) => s + Number(c.amount), 0).toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costs.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{format(new Date(c.date), "MMM d, yyyy")}</TableCell>
                <TableCell className="font-medium">{c.category}</TableCell>
                <TableCell>
                  <Badge variant={c.type === "recurring" ? "secondary" : "outline"}>
                    {c.type === "recurring"
                      ? `${c.recurring_frequency || ""}`
                      : "One-time"}
                  </Badge>
                </TableCell>
                <TableCell>ETB {Number(c.amount).toFixed(2)}</TableCell>
                <TableCell className="max-w-xs truncate">{c.description || "—"}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => onDelete(c.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
