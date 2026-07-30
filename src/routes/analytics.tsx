import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApplicationsStore } from "@/store/useApplications";
import { INTERVIEW_STATUSES, STATUS_LABEL, STATUS_ORDER, type Status } from "@/lib/status";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { format, subMonths, startOfMonth, parseISO, isSameMonth } from "date-fns";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics" },
      { name: "description", content: "Trends and conversion metrics for your job applications." },
    ],
  }),
  component: AnalyticsPage,
});

const STATUS_COLORS: Partial<Record<Status, string>> = {
  applied: "#3b82f6", recruiter_call: "#6366f1", assessment: "#06b6d4",
  l1_interview: "#8b5cf6", l2_interview: "#a855f7", l3_interview: "#d946ef",
  hr_interview: "#ec4899", on_hold: "#f59e0b", rejected: "#ef4444",
  ghosted: "#94a3b8", offer: "#10b981", joined: "#22c55e",
};

function AnalyticsPage() {
  const allApps = useApplicationsStore((s) => s.applications);
  const apps = useMemo(() => allApps.filter((a) => !a.archived), [allApps]);

  const { monthly, bySource, statusData, funnel } = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
    const monthCounts = months.map(() => 0);
    const sourceMap = new Map<string, number>();
    const statusCounts = new Map<Status, number>();
    let interviewed = 0;
    let offered = 0;

    for (const a of apps) {
      const applied = parseISO(a.appliedDate);
      for (let i = 0; i < months.length; i++) {
        if (isSameMonth(applied, months[i])) {
          monthCounts[i] += 1;
          break;
        }
      }
      sourceMap.set(a.source, (sourceMap.get(a.source) ?? 0) + 1);
      statusCounts.set(a.status, (statusCounts.get(a.status) ?? 0) + 1);

      if (INTERVIEW_STATUSES.includes(a.status) || a.statusHistory.some((h) => INTERVIEW_STATUSES.includes(h.status))) {
        interviewed += 1;
      }
      if (
        a.status === "offer" || a.status === "joined" ||
        a.statusHistory.some((h) => h.status === "offer" || h.status === "joined")
      ) {
        offered += 1;
      }
    }

    return {
      monthly: months.map((m, i) => ({ month: format(m, "MMM"), count: monthCounts[i] })),
      bySource: [...sourceMap.entries()]
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count),
      statusData: STATUS_ORDER
        .map((s) => ({ name: STATUS_LABEL[s], value: statusCounts.get(s) ?? 0, color: STATUS_COLORS[s] ?? "#94a3b8" }))
        .filter((d) => d.value > 0),
      funnel: { total: apps.length, interviewed, offered },
    };
  }, [apps]);

  const conversion = funnel.total ? Math.round((funnel.interviewed / funnel.total) * 100) : 0;
  const offerRate = funnel.total ? Math.round((funnel.offered / funnel.total) * 100) : 0;

  return (
    <>
      <PageHeader title="Analytics" description="Understand your job search performance" />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total applications" value={funnel.total} />
        <MetricCard label="Interview conversion" value={`${conversion}%`} sub={`${funnel.interviewed} reached an interview`} />
        <MetricCard label="Offer rate" value={`${offerRate}%`} sub={`${funnel.offered} offers received`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Applications by month</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} className="text-xs" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar isAnimationActive={false} dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Status distribution</CardTitle></CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie isAnimationActive={false} data={statusData} innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                        {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Status names and values visible from start without hovering */}
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs border-t border-border/50 pt-2.5">
                  {statusData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 font-medium">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}:</span>
                      <span className="font-semibold tabular-nums text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">By source</CardTitle></CardHeader>
        <CardContent className="h-72">
          {bySource.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySource} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} className="text-xs" allowDecimals={false} />
                <YAxis type="category" dataKey="source" tickLine={false} axisLine={false} className="text-xs" width={100} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar isAnimationActive={false} dataKey="count" fill="var(--primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

    </>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
