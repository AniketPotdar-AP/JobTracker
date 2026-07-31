import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  ExternalLink,
  Mail,
  Building2,
  MapPin,
  Calendar as CalIcon,
  Briefcase,
  Copy,
  Phone,
  User,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { StatusBadge } from "@/components/apps/StatusBadge";
import { ApplicationForm } from "@/components/apps/ApplicationForm";
import { useApplicationsStore } from "@/store/useApplications";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  WORK_MODE_LABEL,
  type Status,
} from "@/lib/status";
import { fmtDate, fmtRelative } from "@/lib/format";
import { toast } from "sonner";
import { StatusDateModal } from "@/components/apps/StatusDateModal";

export const Route = createFileRoute("/applications/$id")({
  head: () => ({
    meta: [
      { title: "Application details — JobTrack" },
      {
        name: "description",
        content:
          "Details, timeline, interviews, and notes for this application.",
      },
    ],
  }),
  component: DetailsPage,
  notFoundComponent: () => (
    <div className="py-16 text-center">
      <h2 className="text-lg font-semibold">Application not found</h2>
      <Link
        to="/applications"
        className="mt-3 inline-block text-sm text-primary hover:underline"
      >
        Back to applications
      </Link>
    </div>
  ),
});

function DetailsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const app = useApplicationsStore((s) =>
    s.applications.find((a) => a.id === id),
  );
  const setStatus = useApplicationsStore((s) => s.setStatus);
  const remove = useApplicationsStore((s) => s.remove);

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Status | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!app) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-lg font-semibold">Application not found</h2>
        <Link
          to="/applications"
          className="mt-3 inline-block text-sm text-primary hover:underline"
        >
          Back to applications
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/applications">
            <ArrowLeft className="h-4 w-4" /> Back to applications
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl sm:text-2xl font-bold tracking-tight">
              {app.company}
            </h1>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" /> {app.title}
            </span>
            {app.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {app.location}
              </span>
            )}
            <span>{WORK_MODE_LABEL[app.workMode]}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          {/* <Select value={app.status} onValueChange={(v) => setPendingStatus(v as Status)}>
            <SelectTrigger className="w-full sm:w-48 h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select> */}
          <Button
            variant="outline"
            size="sm"
            className="h-10"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 text-destructive"
            onClick={() => setConfirmDelete(true)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="overview">
            <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="w-max min-w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="timeline" className="hidden sm:inline-flex">
                  Timeline
                </TabsTrigger>
                <TabsTrigger
                  value="interviews"
                  className="hidden sm:inline-flex"
                >
                  Interviews
                </TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="history">Status history</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-4">
              <Card>
                <CardContent className="p-5 grid gap-4 sm:grid-cols-2">
                  <Info label="Status">
                    <StatusBadge status={app.status} />
                  </Info>
                  <Info label="Rejection date">
                    {app.status === "rejected"
                      ? fmtDate(app.rejectionDate)
                      : "—"}
                  </Info>
                  <Info label="Applied">{fmtDate(app.appliedDate)}</Info>
                  <Info label="Source">{app.source}</Info>
                  <Info label="Salary / CTC">{app.salary || "—"}</Info>
                  <Info label="Resume used">{app.resumeUsed || "—"}</Info>
                  <Info label="Interview date">
                    {fmtDate(app.interviewDate)}
                  </Info>
                  <Info label="Follow-up date">
                    {fmtDate(app.followUpDate)}
                  </Info>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <Card>
                <CardContent className="p-5">
                  {app.activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No activity yet.
                    </p>
                  ) : (
                    <ol className="relative border-l border-border pl-5 space-y-4">
                      {app.activity.map((e) => (
                        <li key={e.id}>
                          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary" />
                          <div className="text-sm">{e.message}</div>
                          <div className="text-xs text-muted-foreground">
                            {fmtRelative(e.at)} · {fmtDate(e.at, "MMM d, yyyy")}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interviews" className="mt-4">
              <Card>
                <CardContent className="p-5 space-y-3">
                  {app.interviewDate && (
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">
                        Upcoming
                      </div>
                      <div className="mt-0.5 text-sm font-medium">
                        {fmtDate(app.interviewDate, "EEEE, MMM d, yyyy")}
                      </div>
                    </div>
                  )}
                  {app.interviews.length === 0 && !app.interviewDate && (
                    <p className="text-sm text-muted-foreground">
                      No interviews recorded.
                    </p>
                  )}
                  {app.interviews.map((iv) => (
                    <div key={iv.id} className="rounded-md border p-3">
                      <div className="text-sm font-medium">{iv.type}</div>
                      <div className="text-xs text-muted-foreground">
                        {fmtDate(iv.at, "EEEE, MMM d, yyyy")}
                      </div>
                      {iv.notes && (
                        <div className="mt-1 text-sm">{iv.notes}</div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardContent className="p-5">
                  {app.notes ? (
                    <p className="whitespace-pre-wrap text-sm">{app.notes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No notes added.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardContent className="p-5">
                  <ol className="space-y-3">
                    {app.statusHistory.map((h, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between text-sm"
                      >
                        <StatusBadge status={h.status} />
                        <span className="text-xs text-muted-foreground">
                          {fmtDate(h.at, "MMM d, yyyy · p")}
                        </span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Recruiter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{app.recruiterName || "—"}</span>
              </div>

              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{app.recruiterEmail || "—"}</span>
                </div>
                {app.recruiterEmail && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    title="Copy email"
                    onClick={() => handleCopy(app.recruiterEmail!, "Email")}
                  >
                    {copiedField === "Email" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{app.recruiterPhone || "—"}</span>
                </div>
                {app.recruiterPhone && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    title="Copy phone number"
                    onClick={() =>
                      handleCopy(app.recruiterPhone!, "Phone number")
                    }
                  >
                    {copiedField === "Phone number" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[{ label: "Job posting", href: app.jobUrl }].map((l) => (
                <div
                  key={l.label}
                  className="flex items-center justify-between gap-2 min-w-0"
                >
                  <span className="text-muted-foreground">{l.label}</span>
                  {l.href ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline min-w-0"
                    >
                      <span className="truncate">Open</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Meta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-xs">{fmtDate(app.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span className="text-xs">{fmtRelative(app.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ApplicationForm
        open={editOpen}
        onOpenChange={setEditOpen}
        editing={app}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this application?</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to delete <b>{app.company}</b> — {app.title}. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                remove(app.id);
                toast.success("Deleted");
                navigate({ to: "/applications" });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StatusDateModal
        open={Boolean(pendingStatus)}
        onOpenChange={(open) => {
          if (!open) setPendingStatus(null);
        }}
        companyName={app.company}
        targetStatus={pendingStatus}
        onConfirm={async (dateIso) => {
          if (pendingStatus) {
            await setStatus(app.id, pendingStatus, dateIso);
            toast.success(`Status updated to ${STATUS_LABEL[pendingStatus]}`);
            setPendingStatus(null);
          }
        }}
      />
    </>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}
