import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  SlidersHorizontal,
  HelpCircle,
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
  Layers,
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
import type { QuestionItem, QuestionType, Difficulty } from "@/types/interviews";
import {
  PRESET_LANGUAGES,
  PRESET_SUB_LANGUAGES,
  QUESTION_TYPE_CLASSES,
  QUESTION_TYPE_LABELS,
} from "@/types/interviews";
import { QuestionCard } from "@/components/questions/QuestionCard";
import { QuestionFormModal } from "@/components/questions/QuestionFormModal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/questions")({
  head: () => ({
    meta: [
      { title: "Questions Bank — JobTrack" },
      {
        name: "description",
        content: "Browse and filter all technical, theoretical, scenario, and MCQ interview questions.",
      },
    ],
  }),
  component: QuestionsPage,
});

function QuestionsPage() {
  const getAllQuestions = useInterviewsStore((s) => s.getAllQuestions);
  const addStandaloneQuestion = useInterviewsStore((s) => s.addStandaloneQuestion);
  const updateQuestion = useInterviewsStore((s) => s.updateQuestion);
  const deleteQuestion = useInterviewsStore((s) => s.deleteQuestion);

  const questions = getAllQuestions();

  // View mode: 'table' as default
  const [view, setView] = useState<"table" | "grid">("table");

  // Search & Filter State
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [companyFilter, setCompanyFilter] = useState<string[]>([]);
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string[]>([]);
  const [languageFilter, setLanguageFilter] = useState<string[]>([]);
  const [subLanguageFilter, setSubLanguageFilter] = useState<string[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Draft filter state for sheet
  const [draftCompanyFilter, setDraftCompanyFilter] = useState<string[]>([]);
  const [draftQuestionTypeFilter, setDraftQuestionTypeFilter] = useState<string[]>([]);
  const [draftLanguageFilter, setDraftLanguageFilter] = useState<string[]>([]);
  const [draftSubLanguageFilter, setDraftSubLanguageFilter] = useState<string[]>([]);
  const [draftDifficultyFilter, setDraftDifficultyFilter] = useState<string[]>([]);
  const [draftSourceFilter, setDraftSourceFilter] = useState<string>("all");
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");

  // Modal State
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Dynamic filter options derived from current questions dataset
  const companyOptions = useMemo<Option[]>(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (q.company) set.add(q.company);
    });
    return Array.from(set).map((c) => ({ label: c, value: c }));
  }, [questions]);

  const questionTypeOptions: Option[] = [
    { label: "Theoretical", value: "theoretical" },
    { label: "Practical / Coding", value: "practical" },
    { label: "Scenario Based", value: "scenario" },
    { label: "MCQ Based", value: "mcq" },
  ];

  const languageOptions = useMemo<Option[]>(() => {
    const set = new Set<string>(PRESET_LANGUAGES);
    questions.forEach((q) => {
      if (q.language) set.add(q.language);
    });
    return Array.from(set).map((l) => ({ label: l, value: l }));
  }, [questions]);

  const subLanguageOptions = useMemo<Option[]>(() => {
    const set = new Set<string>(PRESET_SUB_LANGUAGES);
    questions.forEach((q) => {
      if (q.subLanguage) set.add(q.subLanguage);
    });
    return Array.from(set).map((s) => ({ label: s, value: s }));
  }, [questions]);

  const difficultyOptions: Option[] = [
    { label: "Easy", value: "easy" },
    { label: "Medium", value: "medium" },
    { label: "Hard", value: "hard" },
  ];

  const activeFiltersCount =
    (companyFilter.length > 0 ? 1 : 0) +
    (questionTypeFilter.length > 0 ? 1 : 0) +
    (languageFilter.length > 0 ? 1 : 0) +
    (subLanguageFilter.length > 0 ? 1 : 0) +
    (difficultyFilter.length > 0 ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0);

  function handleOpenFiltersSheet(open: boolean) {
    if (open) {
      setDraftCompanyFilter(companyFilter);
      setDraftQuestionTypeFilter(questionTypeFilter);
      setDraftLanguageFilter(languageFilter);
      setDraftSubLanguageFilter(subLanguageFilter);
      setDraftDifficultyFilter(difficultyFilter);
      setDraftSourceFilter(sourceFilter);
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
    setDifficultyFilter(draftDifficultyFilter);
    setSourceFilter(draftSourceFilter);
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    setFiltersOpen(false);
  }

  function clearFilters() {
    setCompanyFilter([]);
    setQuestionTypeFilter([]);
    setLanguageFilter([]);
    setSubLanguageFilter([]);
    setDifficultyFilter([]);
    setSourceFilter("all");
    setStartDate("");
    setEndDate("");
    setQuery("");
  }

  // Filtered questions calculation
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (query.trim()) {
        const searchTerm = query.toLowerCase();
        const matchesQuestion = q.question.toLowerCase().includes(searchTerm);
        const matchesLanguage = q.language.toLowerCase().includes(searchTerm);
        const matchesSubLang = q.subLanguage.toLowerCase().includes(searchTerm);
        const matchesCompany = (q.company || "").toLowerCase().includes(searchTerm);
        const matchesAnswer = (q.answer || "").toLowerCase().includes(searchTerm);
        if (
          !matchesQuestion &&
          !matchesLanguage &&
          !matchesSubLang &&
          !matchesCompany &&
          !matchesAnswer
        ) {
          return false;
        }
      }

      if (companyFilter.length > 0) {
        if (!q.company || !companyFilter.includes(q.company)) return false;
      }

      if (questionTypeFilter.length > 0 && !questionTypeFilter.includes(q.type)) {
        return false;
      }

      if (languageFilter.length > 0 && !languageFilter.includes(q.language)) {
        return false;
      }

      if (
        subLanguageFilter.length > 0 &&
        !subLanguageFilter.includes(q.subLanguage)
      ) {
        return false;
      }

      if (
        difficultyFilter.length > 0 &&
        (!q.difficulty || !difficultyFilter.includes(q.difficulty))
      ) {
        return false;
      }

      if (sourceFilter === "interview" && !q.interviewId) return false;
      if (sourceFilter === "standalone" && q.interviewId) return false;

      if (startDate && q.dateAdded && q.dateAdded < startDate) return false;
      if (endDate && q.dateAdded && q.dateAdded > endDate) return false;

      return true;
    });
  }, [
    questions,
    query,
    companyFilter,
    questionTypeFilter,
    languageFilter,
    subLanguageFilter,
    difficultyFilter,
    sourceFilter,
    startDate,
    endDate,
  ]);

  const difficultyColors = {
    easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-500/20",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200/60 dark:border-amber-500/20",
    hard: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 border-rose-200/60 dark:border-rose-500/20",
  };

  return (
    <>
      <PageHeader
        title="Questions Bank"
        description="All technical, practical, scenario, and MCQ interview questions automatically synchronized from interviews or added directly."
        action={
          <Button
            className="gap-2 shadow-sm"
            onClick={() => {
              setEditingQuestion(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add Question
          </Button>
        }
      />

      {/* Filter & View Switcher Bar */}
      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions by keyword, language (React, Angular, Node), topic (Arrays, Strings)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-background/80"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher */}
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
          {difficultyFilter.map((d) => (
            <Badge key={d} variant="secondary" className="gap-1 text-[11px]">
              Difficulty: {d}
            </Badge>
          ))}
          {sourceFilter !== "all" && (
            <Badge variant="secondary" className="gap-1 text-[11px]">
              Source: {sourceFilter}
            </Badge>
          )}
          {(startDate || endDate) && (
            <Badge variant="secondary" className="gap-1 text-[11px]">
              Date: {startDate || "Any"} to {endDate || "Any"}
            </Badge>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="mt-6">
        {filteredQuestions.length === 0 ? (
          <EmptyState
            icon={<HelpCircle className="h-6 w-6" />}
            title={questions.length === 0 ? "No questions in bank yet" : "No matching questions found"}
            description={
              questions.length === 0
                ? "Add standalone questions or log interviews to build your question bank."
                : "Try adjusting your search terms or filter criteria."
            }
            action={
              questions.length === 0 ? (
                <Button
                  onClick={() => {
                    setEditingQuestion(null);
                    setFormOpen(true);
                  }}
                  className="gap-2 mt-2"
                >
                  <Plus className="h-4 w-4" /> Add First Question
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
                  <TableHead className="font-semibold text-foreground max-w-md">Question Statement</TableHead>
                  <TableHead className="font-semibold text-foreground">Type</TableHead>
                  <TableHead className="font-semibold text-foreground">Language / Tech</TableHead>
                  <TableHead className="font-semibold text-foreground">Sub Lang / Topic</TableHead>
                  <TableHead className="font-semibold text-foreground">Company</TableHead>
                  <TableHead className="font-semibold text-foreground">Difficulty</TableHead>
                  <TableHead className="font-semibold text-foreground">Date</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((q) => (
                  <TableRow key={q.id} className="hover:bg-muted/30 transition-colors">
                    {/* Question Statement */}
                    <TableCell className="font-medium max-w-md">
                      <Link
                        to="/questions/$id"
                        params={{ id: q.id }}
                        className="group flex flex-col"
                      >
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {q.question}
                        </span>
                      </Link>
                    </TableCell>

                    {/* Question Type */}
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          QUESTION_TYPE_CLASSES[q.type],
                        )}
                      >
                        {QUESTION_TYPE_LABELS[q.type]}
                      </span>
                    </TableCell>

                    {/* Language Tag */}
                    <TableCell>
                      <Badge variant="secondary" className="font-medium text-xs">
                        {q.language}
                      </Badge>
                    </TableCell>

                    {/* Sub Language / Topic */}
                    <TableCell className="text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs font-normal">
                        {q.subLanguage}
                      </Badge>
                    </TableCell>

                    {/* Company */}
                    <TableCell className="text-xs text-muted-foreground">
                      {q.company ? (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-primary/70" />
                          {q.company}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    {/* Difficulty */}
                    <TableCell>
                      {q.difficulty ? (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                            difficultyColors[q.difficulty],
                          )}
                        >
                          {q.difficulty}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {q.dateAdded || "—"}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          asChild
                          title="View question details"
                        >
                          <Link to="/questions/$id" params={{ id: q.id }}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingQuestion(q);
                            setFormOpen(true);
                          }}
                          title="Edit question"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setPendingDeleteId(q.id)}
                          title="Delete question"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* Card Grid View */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {filteredQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                onEdit={(item) => {
                  setEditingQuestion(item);
                  setFormOpen(true);
                }}
                onDelete={(id) => setPendingDeleteId(id)}
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
              <SlidersHorizontal className="h-5 w-5 text-primary" /> Filter Questions
            </SheetTitle>
            <SheetDescription>
              Filter questions by company, date, question type, language, topic, and difficulty.
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
                <CalendarIcon className="h-3.5 w-3.5 text-primary" /> Date Added
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
                placeholder="Theoretical, Practical, Scenario, MCQ..."
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
                placeholder="React, Angular, Node, Tailwind, Bootstrap..."
              />
            </div>

            {/* Sub Language / Category Filter */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 font-medium text-xs">
                <Layers className="h-3.5 w-3.5 text-primary" /> Sub Lang / Topic Category
              </Label>
              <MultiSelect
                options={subLanguageOptions}
                selected={draftSubLanguageFilter}
                onChange={setDraftSubLanguageFilter}
                placeholder="Arrays, Strings, Objects, Hooks..."
              />
            </div>

            {/* Difficulty Filter */}
            <div className="space-y-1.5">
              <Label className="font-medium text-xs">Difficulty Level</Label>
              <MultiSelect
                options={difficultyOptions}
                selected={draftDifficultyFilter}
                onChange={setDraftDifficultyFilter}
                placeholder="Easy, Medium, Hard..."
              />
            </div>

            {/* Source Filter */}
            <div className="space-y-1.5">
              <Label className="font-medium text-xs">Question Source</Label>
              <select
                value={draftSourceFilter}
                onChange={(e) => setDraftSourceFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
              >
                <option value="all">All Questions (Interview + Bank)</option>
                <option value="interview">Interview Questions Only</option>
                <option value="standalone">Custom Bank Questions Only</option>
              </select>
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
                setDraftDifficultyFilter([]);
                setDraftSourceFilter("all");
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

      {/* Add / Edit Question Modal */}
      <QuestionFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        editingQuestion={editingQuestion}
        onSubmit={(data) => {
          if (editingQuestion) {
            updateQuestion(editingQuestion.id, data);
          } else {
            addStandaloneQuestion(data);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this question from your question bank. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteId) {
                  deleteQuestion(pendingDeleteId);
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
