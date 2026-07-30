import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link, useNavigate } from "@tanstack/react-router";
import { MoreHorizontal, EyeOff, SlidersHorizontal, ArrowLeftRight, GripVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { STATUS_ORDER, STATUS_LABEL, type Status } from "@/lib/status";
import { useApplicationsStore, type Application } from "@/store/useApplications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmtDate } from "@/lib/format";
import { readLocal, writeLocal } from "@/lib/local-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  applications: Application[];
  onEdit: (a: Application) => void;
  onDelete: (a: Application) => void;
};

const HIDDEN_KEY = "jat.kanban.hidden";
const ORDER_KEY = "jat.kanban.order";

/** Keeps a stored order valid when statuses are added/removed in code. */
function normalizeOrder(stored: unknown): Status[] {
  const list = Array.isArray(stored) ? (stored as Status[]).filter((s) => STATUS_ORDER.includes(s)) : [];
  return [...list, ...STATUS_ORDER.filter((s) => !list.includes(s))];
}

function SortableStatusRow({ status }: { status: Status }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: status });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 border bg-background text-sm font-medium transition-colors hover:bg-accent cursor-grab active:cursor-grabbing select-none",
        isDragging && "opacity-60 shadow-md border-primary"
      )}
      {...attributes}
      {...listeners}
    >
      <span className="truncate">{STATUS_LABEL[status]}</span>
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
}

import { StatusDateModal } from "@/components/apps/StatusDateModal";

export function KanbanBoard({ applications, onEdit, onDelete }: Props) {
  const setStatus = useApplicationsStore((s) => s.setStatus);
  const duplicate = useApplicationsStore((s) => s.duplicate);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Status[]>([]);
  const [order, setOrder] = useState<Status[]>(STATUS_ORDER);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    appId: string;
    companyName: string;
    targetStatus: Status;
  } | null>(null);

  // Restore the user's column preferences (client only).
  useEffect(() => {
    const storedHidden = readLocal<Status[]>(HIDDEN_KEY);
    if (Array.isArray(storedHidden)) setHidden(storedHidden);
    setOrder(normalizeOrder(readLocal<Status[]>(ORDER_KEY)));
  }, []);

  function toggleColumn(status: Status) {
    setHidden((prev) => {
      const next = prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status];
      writeLocal(HIDDEN_KEY, next);
      return next;
    });
  }

  function handleReorderDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as Status);
        const newIndex = prev.indexOf(over.id as Status);
        const next = arrayMove(prev, oldIndex, newIndex);
        writeLocal(ORDER_KEY, next);
        return next;
      });
    }
  }

  function resetColumns() {
    setOrder(STATUS_ORDER);
    setHidden([]);
    writeLocal(ORDER_KEY, STATUS_ORDER);
    writeLocal(HIDDEN_KEY, []);
  }

  const visibleStatuses = useMemo(() => order.filter((s) => !hidden.includes(s)), [order, hidden]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const groups = useMemo(() => {
    const map: Record<Status, Application[]> = STATUS_ORDER.reduce((acc, s) => {
      acc[s] = [];
      return acc;
    }, {} as Record<Status, Application[]>);
    for (const a of applications) (map[a.status] ?? map.applied).push(a);
    return map;
  }, [applications]);

  const active = activeId ? applications.find((a) => a.id === activeId) : null;

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overId = e.over?.id?.toString();
    if (!overId || !overId.startsWith("col-")) return;
    const newStatus = overId.slice(4) as Status;
    const app = applications.find((a) => a.id === e.active.id);
    if (app && app.status !== newStatus) {
      setPendingStatusChange({
        appId: app.id,
        companyName: app.company,
        targetStatus: newStatus,
      });
    }
  }

  async function confirmStatusChange(dateIso: string) {
    if (!pendingStatusChange) return;
    const { appId, targetStatus } = pendingStatusChange;
    await setStatus(appId, targetStatus, dateIso);
    toast.success(`Moved to ${STATUS_LABEL[targetStatus]}`);
    setPendingStatusChange(null);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {visibleStatuses.length} of {STATUS_ORDER.length} columns shown
        </p>
        <div className="flex items-center gap-2">
          {(hidden.length > 0 || order.join() !== STATUS_ORDER.join()) && (
            <Button variant="ghost" size="sm" onClick={resetColumns}>
              Reset
            </Button>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowLeftRight className="h-4 w-4" /> Reorder
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 max-h-80 overflow-y-auto p-2">
              <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">
                Drag & drop to reorder columns
              </p>
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleReorderDragEnd}>
                <SortableContext items={order} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {order.map((s) => (
                      <SortableStatusRow key={s} status={s} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <SlidersHorizontal className="h-4 w-4" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
              <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {order.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={!hidden.includes(s)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => toggleColumn(s)}
                >
                  {STATUS_LABEL[s]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e: DragStartEvent) => setActiveId(e.active.id.toString())}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {visibleStatuses.map((status) => (
            <Column
              key={status}
              status={status}
              items={groups[status]}
              onEdit={onEdit}
              onDelete={onDelete}
              onHide={() => toggleColumn(status)}
              onMove={(dir) => moveColumn(status, dir)}
              onDuplicate={(id) => { void duplicate(id); toast.success("Duplicated"); }}
            />
          ))}
          {visibleStatuses.length === 0 && (
            <div className="w-full rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              All columns are hidden. Use “Columns” to bring them back.
            </div>
          )}
        </div>
        <DragOverlay>
          {active ? <KanbanCard app={active} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <StatusDateModal
        open={Boolean(pendingStatusChange)}
        onOpenChange={(open) => { if (!open) setPendingStatusChange(null); }}
        companyName={pendingStatusChange?.companyName ?? ""}
        targetStatus={pendingStatusChange?.targetStatus ?? null}
        onConfirm={confirmStatusChange}
      />
    </div>
  );
}


function Column({
  status,
  items,
  onEdit,
  onDelete,
  onDuplicate,
  onHide,
  onMove,
}: {
  status: Status;
  items: Application[];
  onEdit: (a: Application) => void;
  onDelete: (a: Application) => void;
  onDuplicate: (id: string) => void;
  onHide: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group/col flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors",
        isOver && "bg-primary/5 border-primary/40",
      )}
    >
      <div className="flex items-center justify-between gap-1 px-3 py-2.5 border-b">
        <div className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">{STATUS_LABEL[status]}</div>
        <div className="flex items-center gap-0.5 shrink-0">
          <span className="text-xs tabular-nums text-muted-foreground bg-background border rounded-full px-2 py-0.5">{items.length}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 transition-opacity group-hover/col:opacity-100 focus-visible:opacity-100"
            title="Move section left"
            onClick={() => onMove(-1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 transition-opacity group-hover/col:opacity-100 focus-visible:opacity-100"
            title="Move section right"
            onClick={() => onMove(1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 transition-opacity group-hover/col:opacity-100 focus-visible:opacity-100"
            title="Hide this section"
            onClick={onHide}
          >
            <EyeOff className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-2 p-2 min-h-25">
        {items.map((a) => (
          <DraggableCard
            key={a.id}
            app={a}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        ))}
        {items.length === 0 && <div className="text-center text-xs text-muted-foreground py-6">No applications</div>}
      </div>
    </div>
  );
}

function DraggableCard({
  app,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  app: Application;
  onEdit: (a: Application) => void;
  onDelete: (a: Application) => void;
  onDuplicate: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: app.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => { if (!isDragging) void navigate({ to: "/applications/$id", params: { id: app.id } }); }}
      className={cn("touch-none cursor-pointer", isDragging && "opacity-40")}
    >
      <KanbanCard
        app={app}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild onPointerDown={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onEdit(app)}>Edit</DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/applications/$id" params={{ id: app.id }}>View details</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(app.id)}>Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(app)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
    </div>
  );
}

export function KanbanCard({ app, actions, dragging }: { app: Application; actions?: React.ReactNode; dragging?: boolean }) {
  return (
    <div className={cn("rounded-md border bg-card p-3 shadow-sm hover:border-primary/40 transition-colors", dragging && "shadow-lg rotate-1")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{app.company}</div>
          <div className="truncate text-xs text-muted-foreground">{app.title}</div>
        </div>
        {actions}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">{app.location || app.source}</span>
        <span className="shrink-0">{fmtDate(app.appliedDate, "MMM d")}</span>
      </div>
    </div>
  );
}
