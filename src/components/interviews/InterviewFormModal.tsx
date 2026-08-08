import { useEffect, useState, useMemo } from "react";
import { Video, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect, type Option } from "@/components/ui/searchable-select";
import type { InterviewOutcome, InterviewRecord, QuestionItem } from "@/types/interviews";
import { useApplicationsStore } from "@/store/useApplications";

type InterviewFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    data: Omit<InterviewRecord, "id" | "createdAt" | "updatedAt">,
  ) => void;
  editingInterview?: InterviewRecord | null;
};

export function InterviewFormModal({
  open,
  onOpenChange,
  onSubmit,
  editingInterview,
}: InterviewFormModalProps) {
  const applications = useApplicationsStore((s) => s.applications);

  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [roundType, setRoundType] = useState("Screening Round");
  const [interviewDate, setInterviewDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [interviewerName, setInterviewerName] = useState("");
  const [locationOrUrl, setLocationOrUrl] = useState("");
  const [outcome, setOutcome] = useState<InterviewOutcome>("completed");
  const [notes, setNotes] = useState("");
  const [questions, setQuestions] = useState<Omit<QuestionItem, "id" | "dateAdded">[]>([]);

  // Company options from applied jobs
  const companyOptions = useMemo<Option[]>(() => {
    const set = new Set<string>();
    applications.forEach((a) => { if (a.company) set.add(a.company.trim()); });
    return Array.from(set).map((c) => ({ label: c, value: c }));
  }, [applications]);

  const roundOptions: Option[] = [
    { label: "Screening Round", value: "Screening Round" },
    { label: "Recruiter Call", value: "Recruiter Call" },
    { label: "Assessment", value: "Assessment" },
    { label: "L1 Technical", value: "L1 Technical" },
    { label: "L2 Technical", value: "L2 Technical" },
    { label: "L3 System Design", value: "L3 System Design" },
    { label: "HR Round", value: "HR Round" },
    { label: "Managerial Round", value: "Managerial Round" },
  ];

  const outcomeOptions: Option[] = [
    { label: "Completed", value: "completed" },
    { label: "Passed", value: "passed" },
    { label: "Failed", value: "failed" },
    { label: "Scheduled / Pending", value: "pending" },
  ];

  useEffect(() => {
    if (editingInterview) {
      setCompany(editingInterview.company || "");
      setJobTitle(editingInterview.jobTitle || "");
      setRoundType(editingInterview.roundType || "Screening Round");
      setInterviewDate(
        editingInterview.interviewDate || new Date().toISOString().slice(0, 10),
      );
      setInterviewerName(editingInterview.interviewerName || "");
      setLocationOrUrl(editingInterview.locationOrUrl || "");
      setOutcome(editingInterview.outcome || "completed");
      setNotes(editingInterview.notes || "");
      setQuestions(editingInterview.questions || []);
    } else {
      setCompany("");
      setJobTitle("");
      setRoundType("Screening Round");
      setInterviewDate(new Date().toISOString().slice(0, 10));
      setInterviewerName("");
      setLocationOrUrl("");
      setOutcome("completed");
      setNotes("");
      setQuestions([]);
    }
  }, [editingInterview, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return;

    const finalRoundType = roundType.trim() || "Screening Round";

    const formattedQuestions: QuestionItem[] = questions.map((q: Omit<QuestionItem, "id" | "dateAdded">, idx: number) => ({
      ...q,
      id: (q as QuestionItem).id || `draft-q-${idx}-${Date.now()}`,
      company: company.trim(),
      jobTitle: jobTitle.trim() || undefined,
      roundType: finalRoundType,
      dateAdded: interviewDate,
    }));

    onSubmit({
      company: company.trim(),
      jobTitle: jobTitle.trim() || undefined,
      roundType: finalRoundType,
      interviewDate,
      interviewerName: interviewerName.trim() || undefined,
      locationOrUrl: locationOrUrl.trim() || undefined,
      outcome,
      notes: notes.trim() || undefined,
      questions: formattedQuestions,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Video className="h-5 w-5 text-primary shrink-0" />
              {editingInterview ? "Edit Interview Round" : "Log New Interview"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-3">
            {/* Company & Role */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold text-xs flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> Company Name *
                </Label>
                <SearchableSelect
                  options={companyOptions}
                  value={company}
                  onChange={(v) => setCompany(v)}
                  placeholder="Select applied company or type custom *"
                  searchPlaceholder="Search company or type new..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle" className="font-semibold text-xs">Job Title / Role</Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
            </div>

            {/* Round Name & Interview Date */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold text-xs">Interview Round *</Label>
                <SearchableSelect
                  options={roundOptions}
                  value={roundType}
                  onChange={(v) => setRoundType(v)}
                  placeholder="Select Round Type *"
                  searchPlaceholder="Search or type round..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interviewDate" className="font-semibold text-xs">Interview Date *</Label>
                <Input
                  id="interviewDate"
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Interviewer & Link */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interviewerName" className="font-semibold text-xs">Interviewer Name</Label>
                <Input
                  id="interviewerName"
                  placeholder="e.g. Lead Tech Recruiter"
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationOrUrl" className="font-semibold text-xs">Interview Recording Link</Label>
                <Input
                  id="locationOrUrl"
                  placeholder="e.g. drive.google.com/rec-123 or loom.com/share/..."
                  value={locationOrUrl}
                  onChange={(e) => setLocationOrUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Round Outcome */}
            <div className="space-y-2">
              <Label className="font-semibold text-xs">Round Outcome</Label>
              <SearchableSelect
                options={outcomeOptions}
                value={outcome}
                onChange={(v) => setOutcome(v as InterviewOutcome)}
                placeholder="Select Outcome"
                searchPlaceholder="Search outcome..."
                allowCustom={false}
              />
            </div>



            {/* General Notes */}
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="notes" className="font-semibold text-xs">Round Notes & Prep (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="System design notes, feedback, questions to ask interviewer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!company.trim() || !roundType}>
              {editingInterview ? "Save Changes" : "Log Interview"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
