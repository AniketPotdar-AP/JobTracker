import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Video,
  Building2,
  Calendar as CalendarIcon,
  Code2,
  FileQuestion,
  RotateCcw,
  Table as TableIcon,
  LayoutGrid,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { MultiSelect, type Option } from "@/components/ui/multi-select";
import { useInterviewsStore } from "@/store/useInterviews";
import type { InterviewRecord, QuestionItem, QuestionType } from "@/types/interviews";
import {
  PRESET_LANGUAGES,
  PRESET_SUB_LANGUAGES,
  QUESTION_TYPE_LABELS,
} from "@/types/interviews";
import { InterviewCard } from "@/components/interviews/InterviewCard";
import { InterviewFormModal } from "@/components/interviews/InterviewFormModal";
import { QuestionFormModal } from "@/components/questions/QuestionFormModal";

export const Route = createFileRoute("/interviews")({
  head: () => ({
    meta: [
      { title: "Interviews — JobTrack" },
      {
        name: "description",
        content: "Track all your interviews and questions asked during each round.",
      },
    ],
  }),
  component: InterviewsPage,
});

function InterviewsPage() {
  const interviews = useInterviewsStore((s) => s.interviews);
  const addInterview = useInterviewsStore((s) => s.addInterview);
  const updateInterview = useInterviewsStore((s) => s.updateInterview);
  const deleteInterview = useInterviewsStore((s) => s.deleteInterview);
  const addQuestionToInterview = useInterviewsStore((s) => s.addQuestionToInterview);
  const updateQuestion = useInterviewsStore((s) => s.updateQuestion);
  const deleteQuestion = useInterviewsStore((s) => s.deleteQuestion);

  // View state: 'table' as default
  const [view, setView] = useState<"table" | "grid">("table");

  // Search & Filter State
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [companyFilter, setCompanyFilter] = useState<string[]>([]);
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string[]>([]);
  const [languageFilter, setLanguageFilter] = useState<string[]>([]);
  const [subLanguageFilter, setSubLanguageFilter] = useState<string[]>([]);
  const [outcomeFilter, setOutcomeFilter] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Draft filter state for sheet
  const [draftCompanyFilter, setDraftCompanyFilter] = useState<string[]>([]);
  const [draftQuestionTypeFilter, setDraftQuestionTypeFilter] = useState<string[]>([]);
  const [draftLanguageFilter, setDraftLanguageFilter] = useState<string[]>([]);
  const [draftSubLanguageFilter, setDraftSubLanguageFilter] = useState<string[]>([]);
  const [draftOutcomeFilter, setDraftOutcomeFilter] = useState<string[]>([]);
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState<InterviewRecord | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Add question directly to interview modal state
  const [addQuestionModalIvId, setAddQuestionModalIvId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);

  // Dynamic filter options derived from current dataset
  const companyOptions = useMemo<Option[]>(() => {
    const set = new Set<string>();
    interviews.forEach((iv) => {
      if (iv.company) set.add(iv.company);
    });
    return Array.from(set).map((c) => ({ label: c, value: c }));
  }, [interviews]);

  const questionTypeOptions: Option[] = [
    { label: "Theoretical", value: "theoretical" },
    { label: "Practical / Coding", value: "practical" },
    { label: "Scenario Based", value: "scenario" },
    { label: "MCQ Based", value: "mcq" },
  ];

  const languageOptions = useMemo<Option[]>(() => {
    const set = new Set<string>(PRESET_LANGUAGES);
    interviews.forEach((iv) => {
      iv.questions.forEach((q) => {
        if (q.language) set.add(q.language);
      });
    });
    return Array.from(set).map((l) => ({ label: l, value: l }));
  }, [interviews]);

  const subLanguageOptions = useMemo<Option[]>(() => {
    const set = new Set<string>(PRESET_SUB_LANGUAGES);
    interviews.forEach((iv) => {
      iv.questions.forEach((q) => {
        if (q.subLanguage) set.add(q.subLanguage);
      });
    });
    return Array.from(set).map((s) => ({ label: s, value: s }));
  }, [interviews]);

  const outcomeOptions: Option[] = [
    { label: "Completed", value: "completed" },
    { label: "Passed", value: "passed" },
    { label: "Failed", value: "failed" },
    { label: "Scheduled / Pending", value: "pending" },
  ];

  const activeFiltersCount =
    (companyFilter.length > 0 ? 1 : 0) +
    (questionTypeFilter.length > 0 ? 1 : 0) +
    (languageFilter.length > 0 ? 1 : 0) +
    (subLanguageFilter.length > 0 ? 1 : 0) +
    (outcomeFilter.length > 0 ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0);

  function handleOpenFiltersSheet(open: boolean) {
    if (open) {
      setDraftCompanyFilter(companyFilter);
      setDraftQuestionTypeFilter(questionTypeFilter);
      setDraftLanguageFilter(languageFilter);
      setDraftSubLanguageFilter(subLanguageFilter);
      setDraftOutcomeFilter(outcomeFilter);
      setDraftStartDate(startDate);
      setDraftEndDate(endDate);
    }
    setFiltersOpen(open);
  }

  function applyFilters() {
    setCompanyFilter(draftCompanyFilter);
    setQuestionTypeFilter(draftQuestionTypeFilter);
    setLanguageFilter(draftLanguageFilter);
    setSubLanguageFilter(draftSubLanguageFilter);
    setOutcomeFilter(draftOutcomeFilter);
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    setFiltersOpen(false);
  }

  function clearFilters() {
    setCompanyFilter([]);
    setQuestionTypeFilter([]);
    setLanguageFilter([]);
    setSubLanguageFilter([]);
    setOutcomeFilter([]);
    setStartDate("");
    setEndDate("");
    setQuery("");
  }

  // Filtered interviews calculation
  const filteredInterviews = useMemo(() => {
    return interviews.filter((iv) => {
      if (
        iv.roundType === "Recruiter call" ||
        iv.roundType === "recruiter_call" ||
        iv.roundType === "Recruiter Call"
      ) {
        return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesCompany = iv.company.toLowerCase().includes(q);
        const matchesTitle = (iv.jobTitle || "").toLowerCase().includes(q);
        const matchesRound = iv.roundType.toLowerCase().includes(q);
        const matchesInterviewer = (iv.interviewerName || "").toLowerCase().includes(q);
        const matchesQuestion = iv.questions.some(
          (item) =>
            item.question.toLowerCase().includes(q) ||
            item.language.toLowerCase().includes(q) ||
            item.subLanguage.toLowerCase().includes(q),
        );
        if (
          !matchesCompany &&
          !matchesTitle &&
          !matchesRound &&
          !matchesInterviewer &&
          !matchesQuestion
        ) {
          return false;
        }
      }

      if (companyFilter.length > 0 && !companyFilter.includes(iv.company)) {
        return false;
      }

      if (
        outcomeFilter.length > 0 &&
        (!iv.outcome || !outcomeFilter.includes(iv.outcome))
      ) {
        return false;
      }

      if (startDate && iv.interviewDate < startDate) return false;
      if (endDate && iv.interviewDate > endDate) return false;

      if (questionTypeFilter.length > 0) {
        const hasMatchingType = iv.questions.some((q) =>
          questionTypeFilter.includes(q.type),
        );
        if (!hasMatchingType) return false;
      }

      if (languageFilter.length > 0) {
        const hasMatchingLang = iv.questions.some((q) =>
          languageFilter.includes(q.language),
        );
        if (!hasMatchingLang) return false;
      }

      if (subLanguageFilter.length > 0) {
        const hasMatchingSubLang = iv.questions.some((q) =>
          subLanguageFilter.includes(q.subLanguage),
        );
        if (!hasMatchingSubLang) return false;
      }

      return true;
    });
  }, [
    interviews,
    query,
    companyFilter,
    outcomeFilter,
    startDate,
    endDate,
    questionTypeFilter,
    languageFilter,
    subLanguageFilter,
  ]);

  const outcomeBadges = {
    passed: (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[11px]">
        <CheckCircle2 className="h-3 w-3" /> Passed
      </Badge>
    ),
    failed: (
      <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1 text-[11px]">
        <XCircle className="h-3 w-3" /> Failed
      </Badge>
    ),
    pending: (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-[11px]">
        <Clock className="h-3 w-3" /> Scheduled
      </Badge>
    ),
    completed: (
      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1 text-[11px]">
        <CheckCircle2 className="h-3 w-3" /> Completed
      </Badge>
    ),
  };

  return (
    <>
      <PageHeader
        title="Interviews"
        description="Log and manage your interview rounds along with all technical, theoretical, scenario, and MCQ questions asked."
        action={
          <Button
            className="gap-2 shadow-sm"
            onClick={() => {
              setEditingInterview(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Log Interview
          </Button>
        }
      />

      {/* Filter & View Switcher Bar */}
      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by company, role, interviewer, question, or language..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-background/80"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border bg-muted p-0.5">
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs gap-1"
              onClick={() => setView("table")}
            >
              <TableIcon className="h-3.5 w-3.5" /> Table
            </Button>
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs gap-1"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Cards
            </Button>
          </div>

          {/* Filter Trigger Button */}
          <Button
            variant="outline"
            className="gap-2 relative h-9 text-xs"
            onClick={() => handleOpenFiltersSheet(true)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="ml-1 px-1.5 py-0.2 text-[10px] h-5 min-w-5 justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-muted-foreground hover:text-foreground h-9"
              onClick={clearFilters}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Badges Bar */}
      {activeFiltersCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Active Filters:</span>
          {companyFilter.map((c) => (
            <Badge key={c} variant="secondary" className="gap-1 text-[11px]">
              Company: {c}
            </Badge>
          ))}
          {questionTypeFilter.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1 text-[11px]">
              Type: {QUESTION_TYPE_LABELS[t as QuestionType] || t}
            </Badge>
          ))}
          {languageFilter.map((l) => (
            <Badge key={l} variant="secondary" className="gap-1 text-[11px]">
              Lang: {l}
            </Badge>
          ))}
          {subLanguageFilter.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 text-[11px]">
              Topic: {s}
            </Badge>
          ))}
          {outcomeFilter.map((o) => (
            <Badge key={o} variant="secondary" className="gap-1 text-[11px]">
              Outcome: {o}
            </Badge>
          ))}
          {(startDate || endDate) && (
            <Badge variant="secondary" className="gap-1 text-[11px]">
              Date: {startDate || "Any"} to {endDate || "Any"}
            </Badge>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="mt-6">
        {filteredInterviews.length === 0 ? (
          <EmptyState
            icon={<Video className="h-6 w-6" />}
            title={interviews.length === 0 ? "No interviews logged yet" : "No matching interviews found"}
            description={
              interviews.length === 0
                ? "Start logging your interview rounds, interviewer details, and questions asked."
                : "Try adjusting your search query or clear filters to see logged interviews."
            }
            action={
              interviews.length === 0 ? (
                <Button
                  onClick={() => {
                    setEditingInterview(null);
                    setFormOpen(true);
                  }}
                  className="gap-2 mt-2"
                >
                  <Plus className="h-4 w-4" /> Log First Interview
                </Button>
              ) : (
                <Button variant="outline" onClick={clearFilters} className="mt-2 gap-1">
                  <RotateCcw className="h-3.5 w-3.5" /> Clear All Filters
                </Button>
              )
            }
          />
        ) : view === "table" ? (
          /* High Visibility Data Table View */
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-semibold text-foreground">Company & Role</TableHead>
                  <TableHead className="font-semibold text-foreground">Round Name</TableHead>
                  <TableHead className="font-semibold text-foreground">Interview Date</TableHead>
                  <TableHead className="font-semibold text-foreground text-center">Questions</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInterviews.map((iv) => (
                  <TableRow key={iv.id} className="hover:bg-muted/30 transition-colors">
                    {/* Company & Role */}
                    <TableCell className="font-medium">

                      <span className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        {iv.company}
                      </span>
                      {iv.jobTitle && (
                        <span className="text-xs text-muted-foreground font-normal">
                          {iv.jobTitle}
                        </span>
                      )}
                    </TableCell>

                    {/* Round Name */}
                    <TableCell>
                      <Badge variant="outline" className="font-medium text-xs">
                        {iv.roundType}
                      </Badge>
                    </TableCell>

                    {/* Interview Date */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {iv.interviewDate || "—"}
                    </TableCell>

                    {/* Questions Count */}
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-semibold text-xs">
                        {iv.questions.length} questions
                      </Badge>
                    </TableCell>

                    {/* Action Buttons */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          asChild
                          title="View full details"
                        >
                          <Link to="/interviews/$id" params={{ id: iv.id }}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {/* <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingInterview(iv);
                            setFormOpen(true);
                          }}
                          title="Edit interview"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setPendingDeleteId(iv.id)}
                          title="Delete interview"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button> */}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* Grid View */
          <div className="grid gap-6">
            {filteredInterviews.map((iv) => (
              <InterviewCard
                key={iv.id}
                interview={iv}
                onEdit={(item) => {
                  setEditingInterview(item);
                  setFormOpen(true);
                }}
                onDelete={(id) => setPendingDeleteId(id)}
                onAddQuestion={(id) => setAddQuestionModalIvId(id)}
                onEditQuestion={(q) => setEditingQuestion(q)}
                onDeleteQuestion={(qId) => deleteQuestion(qId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Slide-over Filter Sheet */}
      <Sheet open={filtersOpen} onOpenChange={handleOpenFiltersSheet}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" /> Filter Interviews
            </SheetTitle>
            <SheetDescription>
              Filter interview rounds by company, date, question type, language, topic, and outcome.
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-5 py-6">
            {/* Company Filter */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 font-medium text-xs">
                <Building2 className="h-3.5 w-3.5 text-primary" /> Company
              </Label>
              <MultiSelect
                options={companyOptions}
                selected={draftCompanyFilter}
                onChange={setDraftCompanyFilter}
                placeholder="Select companies..."
              />
            </div>

            {/* Date Range Filter */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 font-medium text-xs">
                <CalendarIcon className="h-3.5 w-3.5 text-primary" /> Interview Date Range
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">From Date</Label>
                  <Input
                    type="date"
                    value={draftStartDate}
                    onChange={(e) => setDraftStartDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">To Date</Label>
                  <Input
                    type="date"
                    value={draftEndDate}
                    onChange={(e) => setDraftEndDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Question Type Filter */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 font-medium text-xs">
                <FileQuestion className="h-3.5 w-3.5 text-primary" /> Question Type
              </Label>
              <MultiSelect
                options={questionTypeOptions}
                selected={draftQuestionTypeFilter}
                onChange={setDraftQuestionTypeFilter}
                placeholder="Select question types..."
              />
            </div>

            {/* Language / Tech Filter */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 font-medium text-xs">
                <Code2 className="h-3.5 w-3.5 text-primary" /> Language / Tech Stack
              </Label>
              <MultiSelect
                options={languageOptions}
                selected={draftLanguageFilter}
                onChange={setDraftLanguageFilter}
                placeholder="Select React, Angular, Node, Tailwind..."
              />
            </div>

            {/* Sub Language / Category Filter */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 font-medium text-xs">
                Sub Lang / Topic Category
              </Label>
              <MultiSelect
                options={subLanguageOptions}
                selected={draftSubLanguageFilter}
                onChange={setDraftSubLanguageFilter}
                placeholder="Select Arrays, Strings, Objects..."
              />
            </div>

            {/* Outcome Filter */}
            <div className="space-y-1.5">
              <Label className="font-medium text-xs">Outcome Status</Label>
              <MultiSelect
                options={outcomeOptions}
                selected={draftOutcomeFilter}
                onChange={setDraftOutcomeFilter}
                placeholder="Select completed, passed, failed..."
              />
            </div>
          </div>

          <SheetFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setDraftCompanyFilter([]);
                setDraftQuestionTypeFilter([]);
                setDraftLanguageFilter([]);
                setDraftSubLanguageFilter([]);
                setDraftOutcomeFilter([]);
                setDraftStartDate("");
                setDraftEndDate("");
              }}
              className="w-full sm:w-auto"
            >
              Clear
            </Button>
            <Button onClick={applyFilters} className="w-full sm:w-auto">
              Apply Filters
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Log / Edit Interview Modal */}
      <InterviewFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        editingInterview={editingInterview}
        onSubmit={(data) => {
          if (editingInterview) {
            updateInterview(editingInterview.id, data);
          } else {
            addInterview(data);
          }
        }}
      />

      {/* Add Single Question Modal */}
      {addQuestionModalIvId && (
        <QuestionFormModal
          open={!!addQuestionModalIvId}
          onOpenChange={(open) => {
            if (!open) setAddQuestionModalIvId(null);
          }}
          onSubmit={(qData) => {
            if (addQuestionModalIvId) {
              addQuestionToInterview(addQuestionModalIvId, qData);
              setAddQuestionModalIvId(null);
            }
          }}
        />
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <QuestionFormModal
          open={!!editingQuestion}
          onOpenChange={(open) => {
            if (!open) setEditingQuestion(null);
          }}
          editingQuestion={editingQuestion}
          onSubmit={(patch) => {
            if (editingQuestion) {
              updateQuestion(editingQuestion.id, patch);
              setEditingQuestion(null);
            }
          }}
        />
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Interview Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this interview round and its associated questions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteId) {
                  deleteInterview(pendingDeleteId);
                  setPendingDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
