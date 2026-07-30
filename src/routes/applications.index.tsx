import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  LayoutGrid,
  TableIcon,
  MoreHorizontal,
  Briefcase,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/apps/StatusBadge";
import { ApplicationForm } from "@/components/apps/ApplicationForm";
import { KanbanBoard } from "@/components/apps/KanbanBoard";
import { StatusDateModal } from "@/components/apps/StatusDateModal";
import {
  useApplicationsStore,
  type Application,
} from "@/store/useApplications";
import { STATUS_LABEL, STATUS_ORDER, SOURCES, type Status } from "@/lib/status";
import { fmtDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/applications/")({
  head: () => ({
    meta: [
      { title: "Applications" },
      {
        name: "description",
        content: "Browse, filter, and manage all your job applications.",
      },
    ],
  }),
  component: ApplicationsPage,
});

type SortBy = "applied_desc" | "applied_asc" | "company";

function ApplicationsPage() {
  const apps = useApplicationsStore((s) => s.applications);
  const setStatus = useApplicationsStore((s) => s.setStatus);
  const remove = useApplicationsStore((s) => s.remove);
  const duplicate = useApplicationsStore((s) => s.duplicate);

  const navigate = useNavigate();

  const [view, setView] = useState<"table" | "kanban">("table");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("applied_desc");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Application | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    appId: string;
    companyName: string;
    targetStatus: Status;
  } | null>(null);

  const activeFilters =
    (statusFilter !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0) +
    (sortBy !== "applied_desc" ? 1 : 0);

  function resetFilters() {
    setStatusFilter("all");
    setSourceFilter("all");
    setStartDate("");
    setEndDate("");
    setSortBy("applied_desc");
  }

  const filtered = useMemo(() => {
    let list = [...apps];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q) ||
          (a.location ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all")
      list = list.filter((a) => a.status === statusFilter);
    if (sourceFilter !== "all")
      list = list.filter((a) => a.source === sourceFilter);
    if (startDate) {
      const from = new Date(`${startDate}T00:00:00`).getTime();
      list = list.filter((a) => new Date(a.appliedDate).getTime() >= from);
    }
    if (endDate) {
      const to = new Date(`${endDate}T23:59:59`).getTime();
      list = list.filter((a) => new Date(a.appliedDate).getTime() <= to);
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "applied_asc":
          return a.appliedDate < b.appliedDate ? -1 : 1;
        case "company":
          return a.company.localeCompare(b.company);
        default:
          return a.appliedDate > b.appliedDate ? -1 : 1;
      }
    });
    return list;
  }, [apps, query, statusFilter, sourceFilter, startDate, endDate, sortBy]);

  function openEdit(a: Application) {
    setEditing(a);
    setFormOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Applications"
        description={`${filtered.length} of ${apps.length} shown`}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add application
          </Button>
        }
      />

      <Tabs
        value={view}
        onValueChange={(v) => setView(v as "table" | "kanban")}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search company, title, location..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 text-base sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-start shrink-0">
            <Button
              variant="outline"
              className="gap-1.5 shrink-0 flex-1 sm:flex-none h-10"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
              {activeFilters > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-5 px-1.5 text-[11px]"
                >
                  {activeFilters}
                </Badge>
              )}
            </Button>

            <TabsList className="shrink-0 h-10">
              <TabsTrigger value="table" className="gap-1 px-3">
                <TableIcon className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Table</span>
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-1 px-3">
                <LayoutGrid className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Kanban</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="table" className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="h-5 w-5" />}
              title="No applications match your filters"
              description="Try clearing filters or add your first application."
              action={
                <Button
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Add application
                </Button>
              }
            />
          ) : (
            <>
              {/* Mobile Card View (< sm) */}
              <div className="space-y-2.5 sm:hidden">
                {filtered.map((a) => (
                  <Card
                    key={a.id}
                    className="p-3.5 flex flex-col gap-2.5 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() =>
                      navigate({
                        to: "/applications/$id",
                        params: { id: a.id },
                      })
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/applications/$id"
                          params={{ id: a.id }}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-base hover:underline block truncate"
                        >
                          {a.company}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">{a.title}</p>
                      </div>
                      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 -mr-1"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(a)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                to="/applications/$id"
                                params={{ id: a.id }}
                              >
                                View details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                void duplicate(a.id);
                                toast.success("Application duplicated");
                              }}
                            >
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setPendingDelete(a)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={a.status}
                          onValueChange={(val) => {
                            if (val !== a.status) {
                              setPendingStatusChange({
                                appId: a.id,
                                companyName: a.company,
                                targetStatus: val as Status,
                              });
                            }
                          }}
                        >
                          <SelectValue>
                            <StatusBadge status={a.status} />
                          </SelectValue>
                        </Select>
                      </div>
                      <span className="text-[11px]">{fmtDate(a.appliedDate)}</span>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View (>= sm) */}
              <Card className="hidden sm:block overflow-hidden p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Location
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        Source
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Applied
                      </TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((a) => (
                      <TableRow
                        key={a.id}
                        className="cursor-pointer"
                        onClick={() =>
                          navigate({
                            to: "/applications/$id",
                            params: { id: a.id },
                          })
                        }
                      >
                        <TableCell className="font-medium">
                          <Link
                            to="/applications/$id"
                            params={{ id: a.id }}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline"
                          >
                            {a.company}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {a.title}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={a.status}
                            onValueChange={(val) => {
                              if (val !== a.status) {
                                setPendingStatusChange({
                                  appId: a.id,
                                  companyName: a.company,
                                  targetStatus: val as Status,
                                });
                              }
                            }}
                          >
                            <SelectValue>
                              <StatusBadge status={a.status} />
                            </SelectValue>
                          </Select>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {a.location ?? "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {a.source}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {fmtDate(a.appliedDate)}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(a)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  to="/applications/$id"
                                  params={{ id: a.id }}
                                >
                                  View details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  void duplicate(a.id);
                                  toast.success("Application duplicated");
                                }}
                              >
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setPendingDelete(a)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          <KanbanBoard
            applications={filtered}
            onEdit={openEdit}
            onDelete={(a) => setPendingDelete(a)}
          />
        </TabsContent>
      </Tabs>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent className="w-full sm:max-w-sm overflow-y-auto p-0">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              Narrow down the applications you see.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-6 py-5">
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Source
              </Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Applied from
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => {
                    const v = e.target.value;
                    setStartDate(v);
                    if (endDate && v && endDate < v) setEndDate(v);
                  }}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Applied to
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (startDate && v && v < startDate) {
                      toast.error("End date can't be before the start date");
                      return;
                    }
                    setEndDate(v);
                  }}
                />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Sort by
              </Label>
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortBy)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="applied_desc">Newest first</SelectItem>
                  <SelectItem value="applied_asc">Oldest first</SelectItem>
                  <SelectItem value="company">Company A→Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              {filtered.length} matching applications
            </p>
          </div>

          <SheetFooter className="border-t px-6 py-4">
            <Button variant="ghost" onClick={resetFilters}>
              Clear all
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ApplicationForm
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        editing={editing}
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this application?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && (
                <>
                  You're about to delete <b>{pendingDelete.company}</b> —{" "}
                  {pendingDelete.title}. This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) {
                  void remove(pendingDelete.id);
                  toast.success("Application deleted");
                  setPendingDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StatusDateModal
        open={Boolean(pendingStatusChange)}
        onOpenChange={(open) => {
          if (!open) setPendingStatusChange(null);
        }}
        companyName={pendingStatusChange?.companyName ?? ""}
        targetStatus={pendingStatusChange?.targetStatus ?? null}
        onConfirm={async (dateIso) => {
          if (pendingStatusChange) {
            await setStatus(
              pendingStatusChange.appId,
              pendingStatusChange.targetStatus,
              dateIso,
            );
            toast.success(
              `Status updated to ${STATUS_LABEL[pendingStatusChange.targetStatus]}`,
            );
            setPendingStatusChange(null);
          }
        }}
      />
    </>
  );
}
