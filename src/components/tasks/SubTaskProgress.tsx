import { useSubTasksCount } from "@/components/tasks/SubTasksChecklist";
import { Progress } from "@/components/ui/progress";
import { ListChecks } from "lucide-react";

interface SubTaskProgressProps {
  taskId: string;
}

export function SubTaskProgress({ taskId }: SubTaskProgressProps) {
  const { data } = useSubTasksCount(taskId);

  if (!data || data.total === 0) return null;

  const progress = Math.round((data.completed / data.total) * 100);

  return (
    <div className="space-y-1 pt-1 border-t border-border/50 mt-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-muted-foreground">
          <ListChecks className="h-3 w-3" />
          <span className="text-xs">{data.completed}/{data.total}</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  );
}
