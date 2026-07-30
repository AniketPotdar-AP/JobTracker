import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useApplicationsStore } from "@/store/useApplications";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { cn } from "@/lib/utils";
import { INTERVIEW_STATUSES, STATUS_LABEL } from "@/lib/status";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar" },
      { name: "description", content: "Interviews, follow-ups, and deadlines at a glance." },
    ],
  }),
  component: CalendarPage,
});

type EntryKind = "recruiter_call" | "interview" | "followup" | "rejection" | "ghosted" | "on_hold";
type Entry = { id: string; company: string; kind: EntryKind; appId: string };

const KIND_STYLE: Record<EntryKind, string> = {
  recruiter_call: "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200",
  interview: "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200",
  followup: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
  rejection: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
  ghosted: "bg-slate-200 text-slate-700 dark:bg-slate-600/30 dark:text-slate-300",
  on_hold: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
};

const KIND_LABEL: Record<EntryKind, string> = {
  recruiter_call: "Recruite call",
  interview: "Interviews",
  followup: "Follow-ups",
  rejection: "Rejections",
  ghosted: "Ghosted",
  on_hold: "On hold",
};

function CalendarPage() {
  const allApps = useApplicationsStore((s) => s.applications);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(null);
  const apps = useMemo(() => allApps.filter((a) => !a.archived), [allApps]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, Entry[]>();

    const pushEntry = (dateIso: string, entry: Entry) => {
      try {
        const k = format(parseISO(dateIso), "yyyy-MM-dd");
        const arr = map.get(k) ?? [];
        arr.push(entry);
        map.set(k, arr);
      } catch {
        /* invalid date */
      }
    };

    for (const a of apps) {
      const addedOnDay = new Map<string, Set<EntryKind>>();

      const markAdded = (dayStr: string, kind: EntryKind) => {
        const set = addedOnDay.get(dayStr) ?? new Set<EntryKind>();
        set.add(kind);
        addedOnDay.set(dayStr, set);
      };

      const hasAdded = (dayStr: string, kind: EntryKind) => {
        return Boolean(addedOnDay.get(dayStr)?.has(kind));
      };

      // 1. Process status history entries (ONLY allowed categories)
      if (Array.isArray(a.statusHistory)) {
        for (const sh of a.statusHistory) {
          if (!sh.at || !sh.status) continue;
          let kind: EntryKind | null = null;
          if (sh.status === "recruiter_call") kind = "recruiter_call";
          else if (
            sh.status === "assessment" ||
            sh.status === "l1_interview" ||
            sh.status === "l2_interview" ||
            sh.status === "l3_interview" ||
            sh.status === "hr_interview"
          ) {
            kind = "interview";
          } else if (sh.status === "rejected") kind = "rejection";
          else if (sh.status === "ghosted") kind = "ghosted";
          else if (sh.status === "on_hold") kind = "on_hold";

          if (!kind) continue; // Skip unallowed categories (applied, offer, joined)

          const dayStr = sh.at.slice(0, 10);
          if (!hasAdded(dayStr, kind)) {
            markAdded(dayStr, kind);
            pushEntry(sh.at, {
              id: `sh-${a.id}-${kind}-${dayStr}`,
              company: `${a.company} (${STATUS_LABEL[sh.status] ?? sh.status})`,
              kind,
              appId: a.id,
            });
          }
        }
      }

      // 2. Process explicit date fields (with deduplication)
      if (a.interviewDate) {
        const dayStr = a.interviewDate.slice(0, 10);
        if (!hasAdded(dayStr, "interview")) {
          markAdded(dayStr, "interview");
          pushEntry(a.interviewDate, {
            id: `iv-${a.id}-${dayStr}`,
            company: `${a.company} (Interview)`,
            kind: "interview",
            appId: a.id,
          });
        }
      }

      if (a.followUpDate) {
        const dayStr = a.followUpDate.slice(0, 10);
        if (!hasAdded(dayStr, "followup")) {
          markAdded(dayStr, "followup");
          pushEntry(a.followUpDate, {
            id: `fu-${a.id}-${dayStr}`,
            company: `${a.company} (Follow-up)`,
            kind: "followup",
            appId: a.id,
          });
        }
      }

      if (a.rejectionDate) {
        const dayStr = a.rejectionDate.slice(0, 10);
        const kind: EntryKind = a.status === "ghosted" ? "ghosted" : "rejection";
        if (!hasAdded(dayStr, kind)) {
          markAdded(dayStr, kind);
          pushEntry(a.rejectionDate, {
            id: `rj-${a.id}-${kind}-${dayStr}`,
            company: `${a.company} (${a.status === "ghosted" ? "Ghosted" : "Rejection"})`,
            kind,
            appId: a.id,
          });
        }
      }
    }
    return map;
  }, [apps]);

  const selectedEntries = selected ? entriesByDay.get(format(selected, "yyyy-MM-dd")) ?? [] : [];

  const numWeeks = days.length / 7;

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Recruite call, interviews, follow-ups, rejections, ghosted, and hold tracking"
        actions={
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center text-sm font-medium">{format(month, "MMMM yyyy")}</div>
            <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setMonth(startOfMonth(new Date())); setSelected(new Date()); }}>
              Today
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] w-full max-w-full min-w-0 overflow-hidden">
        {/* Calendar Grid Card */}
        <Card className="flex flex-col w-full min-w-0 max-w-full overflow-hidden">
          <CardContent className="p-2 sm:p-4 flex flex-col flex-1 min-w-0 w-full overflow-hidden">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2 shrink-0 w-full min-w-0">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-1 truncate">{d}</div>
              ))}
            </div>
            <div
              className="grid grid-cols-7 gap-1 flex-1 min-h-[280px] sm:min-h-[420px] w-full min-w-0"
              style={{ gridTemplateRows: `repeat(${numWeeks}, minmax(0, 1fr))` }}
            >
              {days.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const entries = entriesByDay.get(key) ?? [];
                const inMonth = isSameMonth(d, month);
                const isSelected = selected && isSameDay(d, selected);
                const isToday = isSameDay(d, new Date());
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(d)}
                    className={cn(
                      "flex flex-col justify-start rounded-md border p-1 sm:p-2 text-left transition-colors hover:bg-accent h-full min-h-[44px] overflow-hidden min-w-0 w-full",
                      !inMonth && "opacity-30",
                      isSelected && "border-primary ring-2 ring-primary/40 bg-primary/5 font-semibold",
                    )}
                  >
                    <div className={cn("text-[11px] sm:text-xs font-semibold shrink-0 text-center sm:text-left truncate w-full", isToday && "text-primary font-bold")}>
                      {format(d, "d")}
                    </div>
                    {/* Mobile Dots View (< sm) */}
                    {entries.length > 0 && (
                      <div className="flex sm:hidden items-center justify-center gap-0.5 mt-1 w-full overflow-hidden">
                        {entries.slice(0, 3).map((e, idx) => (
                          <span key={idx} className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        ))}
                      </div>
                    )}
                    {/* Desktop Text View (>= sm) */}
                    <div className="hidden sm:block mt-1 flex-1 space-y-1 min-h-0 overflow-y-auto w-full min-w-0">
                      {entries.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          className={cn("truncate rounded px-1.5 py-0.5 text-[10px] leading-tight font-medium", KIND_STYLE[e.kind])}
                        >{e.company}</div>
                      ))}
                      {entries.length > 3 && <div className="text-[10px] text-muted-foreground font-medium truncate">+{entries.length - 3} more</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Details Card */}
        <Card className="flex flex-col w-full min-w-0 max-w-full overflow-hidden lg:min-h-[450px]">
          <CardContent className="p-4 flex flex-col flex-1 min-w-0 w-full overflow-hidden">
            <div className="text-sm font-semibold border-b pb-3 shrink-0 truncate w-full min-w-0">
              {selected ? format(selected, "EEEE, MMM d, yyyy") : "Select a day"}
            </div>
            <div className="mt-3 space-y-2 flex-1 overflow-y-auto max-h-[350px] lg:max-h-none w-full min-w-0">
              {selected && selectedEntries.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Nothing scheduled for this day.</p>
              )}
              {!selected && (
                <p className="text-sm text-muted-foreground py-4 text-center">Tap any day to view entries.</p>
              )}
              {selectedEntries.map((e) => (
                <Link
                  key={e.id}
                  to="/applications/$id"
                  params={{ id: e.appId }}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2.5 hover:bg-accent transition-colors w-full min-w-0 overflow-hidden"
                >
                  <div className="text-sm font-medium truncate flex-1 min-w-0">{e.company}</div>
                  <span className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 shrink-0 max-w-[110px] truncate",
                    KIND_STYLE[e.kind]
                  )}>{KIND_LABEL[e.kind]}</span>
                </Link>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t space-y-2 text-xs text-muted-foreground shrink-0 w-full min-w-0">
              <div className="font-semibold text-foreground mb-2">Event Categories</div>
              <div className="flex items-center justify-between gap-2 min-w-0"><span className="flex items-center gap-2 truncate"><span className="h-2.5 w-2.5 rounded-full bg-teal-500 shrink-0" /> Recruite call</span><span className="text-[11px] text-muted-foreground shrink-0">Teal</span></div>
              <div className="flex items-center justify-between gap-2 min-w-0"><span className="flex items-center gap-2 truncate"><span className="h-2.5 w-2.5 rounded-full bg-violet-500 shrink-0" /> Interviews</span><span className="text-[11px] text-muted-foreground shrink-0">Violet</span></div>
              <div className="flex items-center justify-between gap-2 min-w-0"><span className="flex items-center gap-2 truncate"><span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" /> Follow-ups</span><span className="text-[11px] text-muted-foreground shrink-0">Blue</span></div>
              <div className="flex items-center justify-between gap-2 min-w-0"><span className="flex items-center gap-2 truncate"><span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" /> Rejections</span><span className="text-[11px] text-muted-foreground shrink-0">Rose</span></div>
              <div className="flex items-center justify-between gap-2 min-w-0"><span className="flex items-center gap-2 truncate"><span className="h-2.5 w-2.5 rounded-full bg-slate-400 shrink-0" /> Ghosted</span><span className="text-[11px] text-muted-foreground shrink-0">Slate</span></div>
              <div className="flex items-center justify-between gap-2 min-w-0"><span className="flex items-center gap-2 truncate"><span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" /> On hold</span><span className="text-[11px] text-muted-foreground shrink-0">Amber</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
