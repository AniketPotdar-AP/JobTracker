import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INTERVIEW_STATUSES, STATUS_ORDER, STATUS_LABEL, SOURCES, WORK_MODE_LABEL, LOCATION_SUGGESTIONS, RESUME_SUGGESTIONS, type Status, type WorkMode } from "@/lib/status";
import { toDateInput } from "@/lib/format";
import { useApplicationsStore, type Application } from "@/store/useApplications";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Application | null;
};

const emptyForm = {
  company: "",
  title: "",
  location: "",
  workMode: "remote" as WorkMode,
  appliedDate: toDateInput(new Date().toISOString()),
  status: "applied" as Status,
  statusDates: { applied: toDateInput(new Date().toISOString()) } as Partial<Record<Status, string>>,
  source: "LinkedIn",
  recruiterName: "",
  recruiterEmail: "",
  jobUrl: "",
  salary: "",
  resumeUsed: "",
  interviewDate: "",
  followUpDate: "",
  rejectionDate: "",
  notes: "",
};

export function ApplicationForm({ open, onOpenChange, editing }: Props) {
  const add = useApplicationsStore((s) => s.add);
  const update = useApplicationsStore((s) => s.update);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open && editing) {
      const fresh = useApplicationsStore.getState().applications.find((a) => a.id === editing.id) ?? editing;
      const dates: Partial<Record<Status, string>> = {};
      if (Array.isArray(fresh.statusHistory)) {
        for (const sh of fresh.statusHistory) {
          if (sh.status && sh.at) {
            dates[sh.status] = toDateInput(sh.at);
          }
        }
      }
      if (fresh.appliedDate && !dates.applied) dates.applied = toDateInput(fresh.appliedDate);
      if (fresh.interviewDate && INTERVIEW_STATUSES.includes(fresh.status) && !dates[fresh.status]) {
        dates[fresh.status] = toDateInput(fresh.interviewDate);
      }
      if (fresh.rejectionDate && fresh.status === "rejected" && !dates.rejected) {
        dates.rejected = toDateInput(fresh.rejectionDate);
      }
      if (fresh.rejectionDate && fresh.status === "ghosted" && !dates.ghosted) {
        dates.ghosted = toDateInput(fresh.rejectionDate);
      }
      if (fresh.followUpDate && fresh.status === "on_hold" && !dates.on_hold) {
        dates.on_hold = toDateInput(fresh.followUpDate);
      }
      if (!dates[fresh.status]) {
        dates[fresh.status] = toDateInput(fresh.updatedAt || fresh.appliedDate || new Date().toISOString());
      }

      setForm({
        company: fresh.company,
        title: fresh.title,
        location: fresh.location ?? "",
        workMode: fresh.workMode,
        appliedDate: toDateInput(fresh.appliedDate),
        status: fresh.status,
        statusDates: dates,
        source: fresh.source,
        recruiterName: fresh.recruiterName ?? "",
        recruiterEmail: fresh.recruiterEmail ?? "",
        jobUrl: fresh.jobUrl ?? "",
        salary: fresh.salary ?? "",
        resumeUsed: fresh.resumeUsed ?? "",
        interviewDate: toDateInput(fresh.interviewDate),
        followUpDate: toDateInput(fresh.followUpDate),
        rejectionDate: toDateInput(fresh.rejectionDate),
        notes: fresh.notes ?? "",
      });
    } else if (open) {
      setForm(emptyForm);
    }
  }, [editing, open]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleStatusChange(newStatus: Status) {
    setForm((f) => {
      const dates = { ...f.statusDates };
      if (!dates[newStatus]) {
        dates[newStatus] = toDateInput(new Date().toISOString());
      }
      return {
        ...f,
        status: newStatus,
        statusDates: dates,
      };
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim() || !form.title.trim()) {
      toast.error("Company and job title are required");
      return;
    }

    const updatedHistory: { status: Status; at: string }[] = [];
    for (const s of STATUS_ORDER) {
      const d = form.statusDates[s];
      if (d) {
        updatedHistory.push({ status: s, at: new Date(d).toISOString() });
      }
    }

    const currentStatusDate = form.statusDates[form.status]
      ? new Date(form.statusDates[form.status]!).toISOString()
      : new Date().toISOString();

    const latestInterviewDate = STATUS_ORDER.filter((s) => INTERVIEW_STATUSES.includes(s) && form.statusDates[s])
      .map((s) => new Date(form.statusDates[s]!).toISOString())
      .slice(-1)[0];

    const appliedIso = form.statusDates.applied
      ? new Date(form.statusDates.applied).toISOString()
      : (editing ? editing.appliedDate : new Date().toISOString());

    const followUpIso = form.followUpDate
      ? new Date(form.followUpDate).toISOString()
      : undefined;

    const rejectionIso = form.statusDates.rejected
      ? new Date(form.statusDates.rejected).toISOString()
      : (form.statusDates.ghosted ? new Date(form.statusDates.ghosted).toISOString() : undefined);

    const payload = {
      company: form.company.trim(),
      title: form.title.trim(),
      location: form.location || undefined,
      workMode: form.workMode,
      appliedDate: appliedIso,
      status: form.status,
      source: form.source,
      recruiterName: form.recruiterName || undefined,
      recruiterEmail: form.recruiterEmail || undefined,
      jobUrl: form.jobUrl || undefined,
      salary: form.salary || undefined,
      resumeUsed: form.resumeUsed || undefined,
      interviewDate: latestInterviewDate ?? undefined,
      followUpDate: followUpIso,
      rejectionDate: rejectionIso,
      notes: form.notes || undefined,
      priority: "medium" as const,
      statusHistory: updatedHistory,
    };

    if (editing) {
      void update(editing.id, payload, currentStatusDate);
      toast.success("Application updated");
    } else {
      void add(payload, currentStatusDate);
      toast.success("Application added");
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        <form onSubmit={submit} className="flex h-full flex-col">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{editing ? "Edit application" : "Add application"}</SheetTitle>
            <SheetDescription>
              {editing ? "Update the details for this application." : "Track a new job application."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Company *">
                <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Linear" required />
              </Field>
              <Field label="Job title *">
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Senior Engineer" required />
              </Field>
              <Field label="Location">
                <Input
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  list="location-suggestions"
                  placeholder="Pick a suggestion or type your own"
                />
                <datalist id="location-suggestions">
                  {LOCATION_SUGGESTIONS.map((l) => <option key={l} value={l} />)}
                </datalist>
              </Field>
              <Field label="Work mode">
                <Select value={form.workMode} onValueChange={(v) => set("workMode", v as WorkMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(WORK_MODE_LABEL) as WorkMode[]).map((k) => (
                      <SelectItem key={k} value={k}>{WORK_MODE_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => handleStatusChange(v as Status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Source">
                <Select value={form.source} onValueChange={(v) => set("source", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              {/* Render separate date field for each active or previous status */}
              {STATUS_ORDER.filter((s) => Boolean(form.statusDates[s]) || s === form.status).map((s) => (
                <Field key={s} label={`${STATUS_LABEL[s]} date`}>
                  <Input
                    type="date"
                    value={form.statusDates[s] ?? toDateInput(new Date().toISOString())}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((f) => ({
                        ...f,
                        statusDates: { ...f.statusDates, [s]: val },
                      }));
                    }}
                  />
                </Field>
              ))}

              <Field label="Recruiter name">
                <Input value={form.recruiterName} onChange={(e) => set("recruiterName", e.target.value)} />
              </Field>
              <Field label="Recruiter email">
                <Input type="email" value={form.recruiterEmail} onChange={(e) => set("recruiterEmail", e.target.value)} />
              </Field>
              <Field label="Job posting URL" className="sm:col-span-2">
                <Input value={form.jobUrl} onChange={(e) => set("jobUrl", e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Salary / CTC">
                <Input value={form.salary} onChange={(e) => set("salary", e.target.value)} placeholder="e.g. 3 LPA" />
              </Field>
              <Field label="Resume used">
                <Input
                  value={form.resumeUsed}
                  onChange={(e) => set("resumeUsed", e.target.value)}
                  list="resume-suggestions"
                  placeholder="Pick a suggestion or type your own"
                />
                <datalist id="resume-suggestions">
                  {RESUME_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
                </datalist>
              </Field>
              <Field label="Follow-up date">
                <Input type="date" value={form.followUpDate} onChange={(e) => set("followUpDate", e.target.value)} />
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={4} />
              </Field>
            </div>
          </div>

          <SheetFooter className="border-t px-6 py-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{editing ? "Save changes" : "Add application"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
