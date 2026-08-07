import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
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
  ArrowUpDown,
  Upload,
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
import { cn, formatNiceDate } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { processSmartJsonImport } from "@/lib/data-importer";
import { useApplicationsStore } from "@/store/useApplications";
import { toast } from "sonner";

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
  const interviews = useInterviewsStore((s) => s.interviews);
  const standaloneQuestions = useInterviewsStore((s) => s.standaloneQuestions);
  const getAllQuestions = useInterviewsStore((s) => s.getAllQuestions);
  const importQuestions = useInterviewsStore((s) => s.importQuestions);
  const importInterviews = useInterviewsStore((s) => s.importInterviews);
  const importAppsData = useApplicationsStore((s) => s.importData);
  const importFileRef = useRef<HTMLInputElement>(null);
  const addStandaloneQuestion = useInterviewsStore((s) => s.addStandaloneQuestion);
  const updateQuestion = useInterviewsStore((s) => s.updateQuestion);

  const questions = useMemo(
    () => getAllQuestions(),
    [interviews, standaloneQuestions, getAllQuestions],
  );

  // View mode & Sort order
  const [view, setView] = useState<"table" | "grid">("table");
  const [sortBy, setSortBy] = useState<
    "count_desc" | "count_asc" | "date_desc" | "date_asc" | "difficulty_desc" | "difficulty_asc"
  >("count_desc");

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

  const [formOpen, setFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);

  const companyOptions = useMemo<Option[]>(() => {
    const set = new Set<string>();
    questions.forEach((q) => { if (q.company) set.add(q.company); });
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
    questions.forEach((q) => { if (q.language) set.add(q.language); });
    return Array.from(set).map((l) => ({ label: l, value: l }));
  }, [questions]);

  const subLanguageOptions = useMemo<Option[]>(() => {
    const set = new Set<string>(PRESET_SUB_LANGUAGES);
    questions.forEach((q) => { if (q.subLanguage) set.add(q.subLanguage); });
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

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (query.trim()) {
        const searchTerm = query.toLowerCase();
        const matchesQuestion = (q.question || "").toLowerCase().includes(searchTerm);
        const matchesLanguage = (q.language || "").toLowerCase().includes(searchTerm);
        const matchesSubLang = (q.subLanguage || "").toLowerCase().includes(searchTerm);
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

      if (companyFilter.length > 0 && (!q.company || !companyFilter.includes(q.company))) {
        return false;
      }

      if (questionTypeFilter.length > 0 && !questionTypeFilter.includes(q.type)) {
        return false;
      }

      if (languageFilter.length > 0 && (!q.language || !languageFilter.includes(q.language))) {
        return false;
      }

      if (
        subLanguageFilter.length > 0 &&
        (!q.subLanguage || !subLanguageFilter.includes(q.subLanguage))
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

  const sortedQuestions = useMemo(() => {
    return [...filteredQuestions].sort((a, b) => {
      if (sortBy === "count_desc") return (b.askedCount || 1) - (a.askedCount || 1);
      if (sortBy === "count_asc") return (a.askedCount || 1) - (b.askedCount || 1);
      if (sortBy === "date_desc") return (b.dateAdded || "").localeCompare(a.dateAdded || "");
      if (sortBy === "date_asc") return (a.dateAdded || "").localeCompare(b.dateAdded || "");
      if (sortBy === "difficulty_desc") {
        const order = { hard: 3, medium: 2, easy: 1 };
        return (order[b.difficulty || "easy"] || 0) - (order[a.difficulty || "easy"] || 0);
      }
      const order = { hard: 3, medium: 2, easy: 1 };
      return (order[a.difficulty || "easy"] || 0) - (order[b.difficulty || "easy"] || 0);
    });
  }, [filteredQuestions, sortBy]);

  const difficultyColors = {
    easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-500/20",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200/60 dark:border-amber-500/20",
    hard: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 border-rose-200/60 dark:border-rose-500/20",
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const stats = await processSmartJsonImport(text, {
        importApplications: async (data) => importAppsData(data),
        importInterviews: async (data) => importInterviews(data),
        importQuestions: async (data) => importQuestions(data),
      });
      toast.success(`Imported ${stats.questions || stats.interviews || stats.applications} records`);
    } catch {
      toast.error("Could not import file — invalid JSON format.");
    }
  };

  return (
    <>
      <input
        ref={importFileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImportFile(f);
          e.target.value = "";
        }}
      />
      <PageHeader
        title="Questions Bank"
        description="All technical, practical, scenario, and MCQ interview questions."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => importFileRef.current?.click()}
              className="gap-1.5"
            >
              <Upload className="h-4 w-4" /> Import
            </Button>
            <Button className="gap-2" onClick={() => { setEditingQuestion(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4" /> Add Question
            </Button>
          </div>
        }
      />

      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-background/80"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="h-9 w-45 text-xs">
              <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="count_desc">Times Asked (High)</SelectItem>
              <SelectItem value="count_asc">Times Asked (Low)</SelectItem>
              <SelectItem value="date_desc">Date Added (New)</SelectItem>
              <SelectItem value="date_asc">Date Added (Old)</SelectItem>
              <SelectItem value="difficulty_desc">Difficulty (Hard-Easy)</SelectItem>
              <SelectItem value="difficulty_asc">Difficulty (Easy-Hard)</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center rounded-lg border bg-muted p-0.5">
            <Button variant={view === "table" ? "secondary" : "ghost"} size="sm" className="h-8 px-2.5 text-xs gap-1" onClick={() => setView("table")}>
              <TableIcon className="h-3.5 w-3.5" /> Table
            </Button>
            <Button variant={view === "grid" ? "secondary" : "ghost"} size="sm" className="h-8 px-2.5 text-xs gap-1" onClick={() => setView("grid")}>
              <LayoutGrid className="h-3.5 w-3.5" /> Cards
            </Button>
          </div>

          <Button variant="outline" className="gap-2 h-9 text-xs" onClick={() => handleOpenFiltersSheet(true)}>
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
            {activeFiltersCount > 0 && <Badge variant="default" className="ml-1 px-1.5 h-5">{activeFiltersCount}</Badge>}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        {sortedQuestions.length === 0 ? (
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
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <Table className="min-w-[850px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[250px]">Question</TableHead>
                  <TableHead className="min-w-[140px]">Type</TableHead>
                  <TableHead className="min-w-[110px]">Language</TableHead>
                  <TableHead className="min-w-[140px]">Topic</TableHead>
                  <TableHead className="min-w-[110px]">Difficulty</TableHead>
                  <TableHead className="text-center min-w-[80px]">Count</TableHead>
                  <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedQuestions.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium max-w-sm">
                      <p className="w-[90%]">{q.question}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={QUESTION_TYPE_CLASSES[q.type]}>{QUESTION_TYPE_LABELS[q.type]}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{q.language}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex flex-wrap gap-1">
                        {q.subLanguage
                          ?.split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .map((sub, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] py-0 font-normal">
                              {sub}
                            </Badge>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {q.difficulty && (
                        <Badge className={`${difficultyColors[q.difficulty]} capitalize`}>
                          {q.difficulty}
                        </Badge>
                      )}                    </TableCell>
                    <TableCell className="text-center"><Badge variant="secondary">{q.askedCount || 1}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          asChild
                          title="View details"
                        >
                          <Link to="/questions/$id" params={{ id: q.id }}>
                            <Eye className="h-4 w-4" />
                          </Link>
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
            {sortedQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                onEdit={(item) => {
                  setEditingQuestion(item);
                  setFormOpen(true);
                }}
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
      </Sheet >

      {/* Add / Edit Question Modal */}
      < QuestionFormModal
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
    </>
  );
}
