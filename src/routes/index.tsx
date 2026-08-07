import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus,
  Briefcase,
  CheckCircle2,
  Clock,
  Trophy,
  XCircle,
  Loader2,
  Eye,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/apps/StatusBadge";
import { ApplicationForm } from "@/components/apps/ApplicationForm";
import { useApplicationsStore } from "@/store/useApplications";
import {
  INTERVIEW_STATUSES,
  IN_PROGRESS_STATUSES,
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_COLOR,
  type Status,
} from "@/lib/status";
import { fmtDate } from "@/lib/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  format,
  subMonths,
  startOfMonth,
  parseISO,
  isSameMonth,
  isAfter,
  isBefore,
  addDays,
} from "date-fns";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard" },
      {
        name: "description",
        content:
          "Overview of your job search: totals, interviews, activity, and trends.",
      },
    ],
  }),
  component: DashboardPage,
});

const STATUS_COLORS: Partial<Record<Status, string>> = {
  applied: "#3b82f6",
  recruiter_call: "#6366f1",
  assessment: "#06b6d4",
  l1_interview: "#8b5cf6",
  l2_interview: "#a855f7",
  l3_interview: "#d946ef",
  hr_interview: "#ec4899",
  on_hold: "#f59e0b",
  rejected: "#ef4444",
  ghosted: "#94a3b8",
  offer: "#10b981",
  joined: "#22c55e",
};

function DashboardPage() {
  const allApps = useApplicationsStore((s) => s.applications);
  const [formOpen, setFormOpen] = useState(false);
  const apps = useMemo(() => allApps.filter((a) => !a.archived), [allApps]);

  const stats = useMemo(() => {
    const total = apps.length;
    const applied = apps.filter((a) => a.status === "applied").length;
    const inProgress = apps.filter((a) =>
      IN_PROGRESS_STATUSES.includes(a.status),
    ).length;
    const interview = apps.filter((a) =>
      INTERVIEW_STATUSES.includes(a.status),
    ).length;
    const offer = apps.filter(
      (a) => a.status === "offer" || a.status === "joined",
    ).length;
    const rejected = apps.filter((a) => a.status === "rejected").length;
    return { total, applied, inProgress, interview, offer, rejected };
  }, [apps]);

  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) =>
      startOfMonth(subMonths(new Date(), 5 - i)),
    );
    return months.map((m) => ({
      month: format(m, "MMM"),
      count: apps.filter((a) => isSameMonth(parseISO(a.appliedDate), m)).length,
    }));
  }, [apps]);

  const statusData = useMemo(() => {
    return STATUS_ORDER.map((s) => ({
      name: STATUS_LABEL[s],
      value: apps.filter((a) => a.status === s).length,
      color: STATUS_COLOR[s] ?? "#94a3b8",
    })).filter((d) => d.value > 0);
  }, [apps]);

  const recent = [...apps]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5);

  const upcomingInterviews = useMemo(() => {
    const start = new Date();
    const end = addDays(start, 21);
    return apps
      .filter(
        (a) =>
          a.interviewDate &&
          isAfter(parseISO(a.interviewDate), start) &&
          isBefore(parseISO(a.interviewDate), end),
      )
      .sort((a, b) => (a.interviewDate! < b.interviewDate! ? -1 : 1))
      .slice(0, 5);
  }, [apps]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your job search at a glance"
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Add application
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Total" value={stats.total} icon={Briefcase} />
        <Kpi
          label="Applied"
          value={stats.applied}
          icon={CheckCircle2}
          accent="text-blue-500"
        />
        <Kpi
          label="In progress"
          value={stats.inProgress}
          icon={Loader2}
          accent="text-indigo-500"
        />
        <Kpi
          label="Interview"
          value={stats.interview}
          icon={Clock}
          accent="text-violet-500"
        />
        <Kpi
          label="Offer"
          value={stats.offer}
          icon={Trophy}
          accent="text-emerald-500"
        />
        <Kpi
          label="Rejected"
          value={stats.rejected}
          icon={XCircle}
          accent="text-red-500"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Applications by month</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                  cursor={{ fill: "var(--accent)" }}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="count"
                  fill="var(--primary)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        isAnimationActive={false}
                        data={statusData}
                        innerRadius={35}
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {statusData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Status names and values visible from start without hovering */}
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs border-t border-border/50 pt-2.5">
                  {statusData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-muted-foreground">{d.name}:</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {d.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between p-4">
            <CardTitle className="text-base">Recent applications</CardTitle>
            <Link
              to="/applications"
              className="text-xs text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 p-4">
            {recent.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No applications yet.
              </p>
            )}
            {recent.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-2 border bg-card/60"
              >
                <div className="min-w-0 flex-1 max-w-52">
                  <div className="truncate text-sm font-medium">
                    {a.company}
                  </div>
                  <StatusBadge className="mt-2" status={a.status} />
                  {/* <div className="truncate text-xs text-muted-foreground">{a.title}</div> */}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* <StatusBadge status={a.status} /> */}
                  {/* <span className="hidden sm:inline text-xs text-muted-foreground w-20 text-right">{fmtDate(a.appliedDate)}</span> */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="View details"
                    asChild
                  >
                    <Link to="/applications/$id" params={{ id: a.id }}>
                      <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming interviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingInterviews.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing scheduled.
              </p>
            )}
            {upcomingInterviews.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-md px-3 py-2 border bg-card/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {a.company}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmtDate(a.interviewDate, "EEE, MMM d")}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  title="View details"
                  asChild
                >
                  <Link to="/applications/$id" params={{ id: a.id }}>
                    <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ApplicationForm open={formOpen} onOpenChange={setFormOpen} />
    </>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </span>
          <Icon
            className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${accent ?? "text-muted-foreground"}`}
          />
        </div>
        <div className="mt-1.5 text-xl sm:text-2xl font-bold tabular-nums">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
