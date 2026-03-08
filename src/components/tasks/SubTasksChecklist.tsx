import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, ListChecks, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SubTask {
  id: string;
  task_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

interface SubTasksChecklistProps {
  taskId: string;
  readOnly?: boolean;
}

export function useSubTasksCount(taskId: string | null) {
  return useQuery({
    queryKey: ["sub-tasks-count", taskId],
    queryFn: async () => {
      if (!taskId) return { total: 0, completed: 0 };
      const { data, error } = await supabase
        .from("sub_tasks")
        .select("is_completed")
        .eq("task_id", taskId);
      if (error) throw error;
      const total = data?.length || 0;
      const completed = data?.filter((s: any) => s.is_completed).length || 0;
      return { total, completed };
    },
    enabled: !!taskId,
  });
}

export function SubTasksChecklist({ taskId, readOnly = false }: SubTasksChecklistProps) {
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const queryClient = useQueryClient();

  const { data: subTasks = [] } = useQuery({
    queryKey: ["sub-tasks", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_tasks")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as SubTask[];
    },
    enabled: !!taskId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sub-tasks", taskId] });
    queryClient.invalidateQueries({ queryKey: ["sub-tasks-count", taskId] });
  };

  const addMutation = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase
        .from("sub_tasks")
        .insert({ task_id: taskId, title });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewTitle("");
      invalidate();
    },
    onError: () => toast.error("Gagal menambah sub-task"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from("sub_tasks")
        .update({ is_completed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error("Gagal update sub-task"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from("sub_tasks")
        .update({ title })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: () => toast.error("Gagal update sub-task"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sub_tasks")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: () => toast.error("Gagal hapus sub-task"),
  });

  const completed = subTasks.filter((s) => s.is_completed).length;
  const total = subTasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addMutation.mutate(newTitle.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm sm:text-base">Sub-Tasks</h3>
        </div>
        {total > 0 && (
          <span className="text-xs text-muted-foreground font-medium">
            {completed} / {total} selesai
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="flex items-center gap-3">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs font-semibold text-muted-foreground w-10 text-right">{progress}%</span>
        </div>
      )}

      <div className="space-y-1">
        {subTasks.map((sub) => (
          <div
            key={sub.id}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 group transition-colors hover:bg-muted/50",
              sub.is_completed && "opacity-60"
            )}
          >
            <Checkbox
              checked={sub.is_completed}
              onCheckedChange={(checked) =>
                toggleMutation.mutate({ id: sub.id, is_completed: !!checked })
              }
              disabled={readOnly}
            />
            {editingId === sub.id ? (
              <div className="flex-1 flex items-center gap-1">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (editTitle.trim()) updateMutation.mutate({ id: sub.id, title: editTitle.trim() });
                    }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    if (editTitle.trim()) updateMutation.mutate({ id: sub.id, title: editTitle.trim() });
                  }}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setEditingId(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                <span
                  className={cn(
                    "flex-1 text-sm cursor-default",
                    sub.is_completed && "line-through"
                  )}
                >
                  {sub.title}
                </span>
                {!readOnly && (
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setEditingId(sub.id);
                        setEditTitle(sub.title);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(sub.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="flex items-center gap-2 pt-1">
          <Input
            placeholder="Tambah sub-task..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleAdd}
            disabled={!newTitle.trim() || addMutation.isPending}
            className="h-8 px-3"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
