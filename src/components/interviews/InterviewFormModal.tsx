import { useEffect, useState } from "react";
import { Video, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InterviewOutcome, InterviewRecord, QuestionItem } from "@/types/interviews";
import { InterviewQuestionForm } from "./InterviewQuestionForm";
import { Badge } from "@/components/ui/badge";

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
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [roundType, setRoundType] = useState("Screening Round");
  const [customRoundType, setCustomRoundType] = useState("");
  const [interviewDate, setInterviewDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [interviewerName, setInterviewerName] = useState("");
  const [locationOrUrl, setLocationOrUrl] = useState("");
  const [outcome, setOutcome] = useState<InterviewOutcome>("completed");
  const [notes, setNotes] = useState("");
  const [questions, setQuestions] = useState<Omit<QuestionItem, "id" | "dateAdded">[]>([]);

  const roundOptions = [
    "Screening Round",
    "Recruiter Call",
    "Assessment",
    "L1 Technical",
    "L2 Technical",
    "L3 System Design",
    "HR Round",
    "Managerial Round",
    "custom",
  ];

  useEffect(() => {
    if (editingInterview) {
      setCompany(editingInterview.company || "");
      setJobTitle(editingInterview.jobTitle || "");
      if (roundOptions.includes(editingInterview.roundType)) {
        setRoundType(editingInterview.roundType);
        setCustomRoundType("");
      } else {
        setRoundType("custom");
        setCustomRoundType(editingInterview.roundType || "");
      }
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
      setCustomRoundType("");
      setInterviewDate(new Date().toISOString().slice(0, 10));
      setInterviewerName("");
      setLocationOrUrl("");
      setOutcome("completed");
      setNotes("");
      setQuestions([]);
    }
  }, [editingInterview, open]);

  const handleAddQuestionDraft = (q: Omit<QuestionItem, "id" | "dateAdded">) => {
    setQuestions([...questions, q]);
  };

  const handleRemoveQuestionDraft = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return;

    const finalRoundType =
      roundType === "custom"
        ? customRoundType.trim() || "Interview Round"
        : roundType;

    const formattedQuestions: QuestionItem[] = questions.map((q, idx) => ({
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              {editingInterview ? "Edit Interview Round" : "Log New Interview"}
            </DialogTitle>
            <DialogDescription>
              Record interview round details, interviewer info, outcome, and questions asked.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Company & Role */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="company">Company Name *</Label>
                <Input
                  id="company"
                  placeholder="e.g. Google, TCS, Infosys"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jobTitle">Job Title / Role</Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g. Frontend Developer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
            </div>

            {/* Round Type & Date */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Interview Round Type</Label>
                <Select
                  value={roundType}
                  onValueChange={(v) => setRoundType(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roundOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt === "custom" ? "+ Custom Round Name" : opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {roundType === "custom" && (
                  <Input
                    placeholder="e.g. Screening Round, System Design"
                    value={customRoundType}
                    onChange={(e) => setCustomRoundType(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="interviewDate">Interview Date</Label>
                <Input
                  id="interviewDate"
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Interviewer & Outcome */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="interviewerName">Interviewer Name</Label>
                <Input
                  id="interviewerName"
                  placeholder="e.g. John Doe (Engineering Lead)"
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Outcome Status</Label>
                <Select
                  value={outcome}
                  onValueChange={(v) => setOutcome(v as InterviewOutcome)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Scheduled / Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Meeting Link */}
            <div className="space-y-1.5">
              <Label htmlFor="locationOrUrl">Meeting Link / Location</Label>
              <Input
                id="locationOrUrl"
                placeholder="e.g. https://meet.google.com/abc-defg-hij"
                value={locationOrUrl}
                onChange={(e) => setLocationOrUrl(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Interview Notes & Feedback</Label>
              <Textarea
                id="notes"
                placeholder="Notes on conversation, feedback received, key discussion points..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Questions Section inside Interview Modal */}
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-xs uppercase tracking-wider">
                  Questions Asked in this Interview ({questions.length})
                </Label>
              </div>

              {questions.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-md border bg-background p-2.5 text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5 pb-0.5">
                          <Badge variant="outline" className="text-[10px] py-0">
                            {q.language}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] py-0">
                            {q.subLanguage}
                          </Badge>
                        </div>
                        <p className="font-medium truncate">{q.question}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleRemoveQuestionDraft(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <InterviewQuestionForm onAddQuestion={handleAddQuestionDraft} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingInterview ? "Save Changes" : "Log Interview"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
