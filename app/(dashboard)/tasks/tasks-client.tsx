"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  ListTodo,
  UserCheck,
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Task } from "@/lib/types/database";

interface TasksClientProps {
  tasks: Task[];
  profiles: { id: string; full_name: string | null; email: string | null }[];
  currentUserId: string;
  isAdmin?: boolean;
}

export function TasksClient({
  tasks: initialTasks,
  profiles,
  currentUserId,
  isAdmin = false,
}: TasksClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignee_id: "" as string | null,
    deadline: "",
    status: "todo" as "todo" | "in_progress" | "done",
    progress: 0,
  });

  const supabase = createClient();
  const myTasks = tasks.filter((t) => t.assignee_id === currentUserId);

  const getProfileName = (id: string | null) => {
    if (!id) return "Unassigned";
    const p = profiles.find((pr) => pr.id === id);
    return p?.full_name || p?.email || "Unknown";
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      assignee_id: null,
      deadline: "",
      status: "todo",
      progress: 0,
    });
    setEditingTask(null);
  };

  const handleOpen = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setForm({
        title: task.title,
        description: task.description || "",
        assignee_id: task.assignee_id,
        deadline: task.deadline ? task.deadline.slice(0, 16) : "",
        status: task.status,
        progress: task.progress,
      });
    } else {
      resetForm();
    }
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        assignee_id: form.assignee_id || null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        status: form.status,
        progress: form.progress,
      };
      if (editingTask) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", editingTask.id);
        if (error) throw error;
        setTasks((prev) =>
          prev.map((t) => (t.id === editingTask.id ? { ...t, ...payload } : t))
        );
        toast.success("Task updated");
      } else {
        const { data: user } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from("tasks")
          .insert({ ...payload, created_by: user?.user?.id })
          .select()
          .single();
        if (error) throw error;
        setTasks((prev) => [data, ...prev]);
        toast.success("Task created");
      }
      setOpen(false);
      resetForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Task deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleStatusChange = async (task: Task, status: "todo" | "in_progress" | "done") => {
    const progress = status === "done" ? 100 : status === "in_progress" ? 50 : 0;
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status, progress })
        .eq("id", task.id);
      if (error) throw error;
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status, progress } : t))
      );
      toast.success("Status updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const TaskTable = ({ list }: { list: typeof tasks }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Deadline</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              No tasks found
            </TableCell>
          </TableRow>
        ) : (
          list.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>{getProfileName(task.assignee_id)}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    task.status === "done"
                      ? "border-green-500 text-green-600"
                      : task.status === "in_progress"
                      ? "border-amber-500 text-amber-600"
                      : ""
                  }
                >
                  {task.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 w-24">
                  <Progress value={task.progress} className="h-2" />
                  <span className="text-xs">{task.progress}%</span>
                </div>
              </TableCell>
              <TableCell>
                {task.deadline
                  ? format(new Date(task.deadline), "MMM d, yyyy")
                  : "—"}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpen(task)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpen(task)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    {task.status !== "done" && (
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(task, "done")}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark done
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleDelete(task.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => handleOpen()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        </div>
      )}
      <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); setOpen(o); }}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Create Task"}</DialogTitle>
              <DialogDescription>
                {editingTask
                  ? "Update the task details below"
                  : "Add a new task and assign it to a team member"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Assign to</Label>
                <Select
                  value={form.assignee_id || "none"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, assignee_id: v === "none" ? null : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name || p.email || p.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v: "todo" | "in_progress" | "done") =>
                      setForm((f) => ({
                        ...f,
                        status: v,
                        progress: v === "done" ? 100 : v === "in_progress" ? 50 : 0,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Progress (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.progress}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, progress: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editingTask ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
      <Tabs defaultValue={isAdmin ? "all" : "mine"}>
        <TabsList>
          {isAdmin && (
            <TabsTrigger value="all">
              <ListTodo className="mr-2 h-4 w-4" />
              All Tasks ({tasks.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="mine">
            <UserCheck className="mr-2 h-4 w-4" />
            My Tasks ({myTasks.length})
          </TabsTrigger>
        </TabsList>
        {isAdmin && (
          <TabsContent value="all" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>All Tasks</CardTitle>
                <CardDescription>Tasks across the entire team</CardDescription>
              </CardHeader>
              <CardContent>
                <TaskTable list={tasks} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
        <TabsContent value="mine" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>My Tasks</CardTitle>
              <CardDescription>Tasks assigned to you</CardDescription>
            </CardHeader>
            <CardContent>
              <TaskTable list={myTasks} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
