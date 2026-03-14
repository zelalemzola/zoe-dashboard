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
import { Plus, Coffee, Bell, MapPin, Check, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Lead {
  id: string;
  cafe_name: string;
  comment: string | null;
  status: string;
  follow_up_date: string | null;
  wait_days: number | null;
  created_at: string;
}

export function LeadsClient({
  leads: initialLeads,
  currentUserId,
  dueForFollowUp,
}: {
  leads: Lead[];
  currentUserId: string;
  dueForFollowUp: Lead[];
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "landed" | "failed">("all");
  const [form, setForm] = useState({
    cafe_name: "",
    comment: "",
    status: "pending" as "pending" | "landed" | "failed",
    wait_days: "" as string | number,
  });

  const supabase = createClient();

  const filteredLeads =
    filter === "all"
      ? leads
      : leads.filter((l) => l.status === filter);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cafe_name.trim()) {
      toast.error("Café name is required");
      return;
    }
    setLoading(true);
    try {
      let followUpDate: string | null = null;
      if (form.status === "pending" && form.wait_days) {
        const d = new Date();
        d.setDate(d.getDate() + Number(form.wait_days));
        followUpDate = format(d, "yyyy-MM-dd");
      }
      const { data, error } = await supabase
        .from("leads")
        .insert({
          cafe_name: form.cafe_name.trim(),
          comment: form.comment.trim() || null,
          status: form.status,
          wait_days: form.wait_days ? Number(form.wait_days) : null,
          follow_up_date: followUpDate,
          created_by: currentUserId,
        })
        .select()
        .single();
      if (error) throw error;
      setLeads((prev) => [data, ...prev]);
      setOpen(false);
      setForm({ cafe_name: "", comment: "", status: "pending", wait_days: "" });
      toast.success("Lead added");
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add lead");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (leadId: string, status: "landed" | "failed") => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ status, follow_up_date: null, wait_days: null, updated_at: new Date().toISOString() })
        .eq("id", leadId);
      if (error) throw error;
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status } : l))
      );
      toast.success(`Marked as ${status}`);
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleUpdateFollowUp = async (leadId: string, days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const followUpDate = format(d, "yyyy-MM-dd");
    try {
      const { error } = await supabase
        .from("leads")
        .update({ follow_up_date: followUpDate, wait_days: days, updated_at: new Date().toISOString() })
        .eq("id", leadId);
      if (error) throw error;
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, follow_up_date: followUpDate, wait_days: days } : l
        )
      );
      toast.success(`Follow-up set for ${followUpDate}`);
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  return (
    <div className="space-y-6">
      {dueForFollowUp.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Bell className="h-5 w-5" />
              Follow-up due ({dueForFollowUp.length})
            </CardTitle>
            <CardDescription>
              These leads need to be contacted. Reach out and update their status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {dueForFollowUp.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-4 rounded-lg border bg-background p-3"
                >
                  <div>
                    <p className="font-medium">{l.cafe_name}</p>
                    {l.comment && (
                      <p className="text-sm text-muted-foreground">{l.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Due: {l.follow_up_date ? format(new Date(l.follow_up_date), "MMM d") : "—"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateFollowUp(l.id, 7)}
                    >
                      +7 days
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(l.id, "landed")}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Landed
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleStatusChange(l.id, "failed")}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Failed
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v: typeof filter) => setFilter(v)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="landed">Landed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Report Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Café Lead</DialogTitle>
              <DialogDescription>
                Add a café from outreach. Set follow-up date if you need to wait.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Café name</Label>
                <Input
                  value={form.cafe_name}
                  onChange={(e) => setForm((f) => ({ ...f, cafe_name: e.target.value }))}
                  placeholder="e.g. Blue Bottle Café"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Comment / Notes</Label>
                <Textarea
                  value={form.comment}
                  onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                  placeholder="Any details from the visit..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v: "pending" | "landed" | "failed") =>
                    setForm((f) => ({ ...f, status: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending (need to follow up)</SelectItem>
                    <SelectItem value="landed">Landed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.status === "pending" && (
                <div className="space-y-2">
                  <Label>Follow up in (days)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.wait_days}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, wait_days: e.target.value || "" }))
                    }
                    placeholder="e.g. 7"
                  />
                  <p className="text-xs text-muted-foreground">
                    You&apos;ll get a notification when it&apos;s time to reach out.
                  </p>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Leads
          </CardTitle>
          <CardDescription>All reported cafés from sales outreach</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Café</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.cafe_name}</TableCell>
                  <TableCell className="max-w-xs truncate">{l.comment || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        l.status === "landed"
                          ? "default"
                          : l.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {l.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {l.follow_up_date ? (
                      <span className={l.follow_up_date <= new Date().toISOString().slice(0, 10) ? "text-primary font-medium" : ""}>
                        {format(new Date(l.follow_up_date), "MMM d, yyyy")}
                        {l.wait_days && ` (${l.wait_days}d)`}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(l.created_at), "MMM d")}</TableCell>
                  <TableCell>
                    {l.status === "pending" && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStatusChange(l.id, "landed")}
                        >
                          Landed
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleStatusChange(l.id, "failed")}
                        >
                          Failed
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateFollowUp(l.id, 7)}
                        >
                          +7d
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
