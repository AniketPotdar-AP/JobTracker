import { cn } from "@/lib/utils";
import { PRIORITY_CLASS, PRIORITY_LABEL, type Priority } from "@/lib/status";

export function PriorityDot({
  priority,
  showLabel = false,
}: {
  priority: Priority;
  showLabel?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", PRIORITY_CLASS[priority])} />
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {PRIORITY_LABEL[priority]}
        </span>
      )}
    </span>
  );
}
