import { useEffect, useState, useMemo } from "react";
import { Plus, HelpCircle, Sparkles, Building2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect, type Option } from "@/components/ui/searchable-select";
import { SearchableMultiSelect, type MultiOption } from "@/components/ui/searchable-multi-select";
import type { MCQOption, QuestionItem, QuestionType, Difficulty } from "@/types/interviews";
import { PRESET_LANGUAGES, PRESET_SUB_LANGUAGES } from "@/types/interviews";
import { useInterviewsStore } from "@/store/useInterviews";
import { useApplicationsStore } from "@/store/useApplications";
import { nanoid } from "nanoid";

type QuestionFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<QuestionItem, "id" | "dateAdded">) => void;
  editingQuestion?: QuestionItem | null;
  defaultCompany?: string;
};

export function QuestionFormModal({
  open,
  onOpenChange,
  onSubmit,
  editingQuestion,
  defaultCompany,
}: QuestionFormModalProps) {
  const getAllQuestions = useInterviewsStore((s) => s.getAllQuestions);
  const applications = useApplicationsStore((s) => s.applications);
  const existingQuestions = useMemo(() => getAllQuestions(), [getAllQuestions, open]);

  const [question, setQuestion] = useState("");
  const [type, setType] = useState<QuestionType | "">("");
  const [language, setLanguage] = useState("");
  const [subLanguages, setSubLanguages] = useState<string[]>([]);
  const [company, setCompany] = useState(defaultCompany || "");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [answer, setAnswer] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [mcqOptions, setMcqOptions] = useState<MCQOption[]>([
    { id: "opt-a", text: "", isCorrect: true },
    { id: "opt-b", text: "", isCorrect: false },
    { id: "opt-c", text: "", isCorrect: false },
    { id: "opt-d", text: "", isCorrect: false },
  ]);
  const [correctOptionId, setCorrectOptionId] = useState("opt-a");

  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    if (!question.trim() || question.trim().length < 2 || editingQuestion) return [];
    const q = question.toLowerCase();
    return existingQuestions
      .filter((item) => item.question.toLowerCase().includes(q))
      .slice(0, 5);
  }, [question, existingQuestions, editingQuestion]);

  const companyOptions = useMemo<Option[]>(() => {
    const set = new Set<string>();
    applications.forEach((a) => { if (a.company) set.add(a.company.trim()); });
    existingQuestions.forEach((q) => { if (q.company) set.add(q.company.trim()); });
    if (defaultCompany) set.add(defaultCompany.trim());
    return Array.from(set).map((c) => ({ label: c, value: c }));
  }, [applications, existingQuestions, defaultCompany]);

  const languageOptions = useMemo<Option[]>(() => {
    return PRESET_LANGUAGES.map((l) => ({ label: l, value: l }));
  }, []);

  const subLanguageOptions = useMemo<MultiOption[]>(() => {
    return PRESET_SUB_LANGUAGES.map((s) => ({ label: s, value: s }));
  }, []);

  const questionTypeOptions: Option[] = [
    { label: "Theoretical", value: "theoretical" },
    { label: "Practical / Coding", value: "practical" },
    { label: "Scenario Based", value: "scenario" },
    { label: "MCQ Based", value: "mcq" },
  ];

  const difficultyOptions: Option[] = [
    { label: "Easy", value: "easy" },
    { label: "Medium", value: "medium" },
    { label: "Hard", value: "hard" },
  ];

  useEffect(() => {
    if (editingQuestion) {
      setQuestion(editingQuestion.question || "");
      setType(editingQuestion.type || "theoretical");
      setLanguage(editingQuestion.language || "");
      const parsedSubs = editingQuestion.subLanguage
        ? editingQuestion.subLanguage.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      setSubLanguages(parsedSubs);
      setCompany(editingQuestion.company || defaultCompany || "");
      setDifficulty(editingQuestion.difficulty || "");
      setAnswer(editingQuestion.answer || "");
      setCodeSnippet(editingQuestion.codeSnippet || "");
      if (editingQuestion.options && editingQuestion.options.length > 0) {
        setMcqOptions(editingQuestion.options);
        const correct = editingQuestion.options.find((o) => o.isCorrect)?.id;
        if (correct) setCorrectOptionId(correct);
      }
    } else {
      setQuestion("");
      setType("");
      setLanguage("");
      setSubLanguages([]);
      setCompany(defaultCompany || "");
      setDifficulty("");
      setAnswer("");
      setCodeSnippet("");
      setMcqOptions([
        { id: "opt-a", text: "", isCorrect: true },
        { id: "opt-b", text: "", isCorrect: false },
        { id: "opt-c", text: "", isCorrect: false },
        { id: "opt-d", text: "", isCorrect: false },
      ]);
      setCorrectOptionId("opt-a");
    }
    setShowSuggestions(false);
  }, [editingQuestion, open, defaultCompany]);

  const handleSelectSuggestion = (suggested: QuestionItem) => {
    setQuestion(suggested.question);
    setType(suggested.type);
    setLanguage(suggested.language || "");
    const parsedSubs = suggested.subLanguage
      ? suggested.subLanguage.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    setSubLanguages(parsedSubs);
    if (suggested.difficulty) setDifficulty(suggested.difficulty);
    if (suggested.answer) setAnswer(suggested.answer);
    if (suggested.codeSnippet) setCodeSnippet(suggested.codeSnippet);
    if (suggested.options && suggested.options.length > 0) {
      setMcqOptions(suggested.options);
    }
    setShowSuggestions(false);
  };

  const handleAddOption = () => {
    const newId = `opt-${nanoid(4)}`;
    setMcqOptions([...mcqOptions, { id: newId, text: "", isCorrect: false }]);
  };

  const handleRemoveOption = (id: string) => {
    if (mcqOptions.length <= 2) return;
    const next = mcqOptions.filter((o) => o.id !== id);
    setMcqOptions(next);
    if (correctOptionId === id) {
      setCorrectOptionId(next[0].id);
    }
  };

  const handleOptionTextChange = (id: string, text: string) => {
    setMcqOptions(
      mcqOptions.map((o) => (o.id === id ? { ...o, text } : o)),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !type || !language) return;

    const formattedOptions =
      type === "mcq"
        ? mcqOptions.map((o) => ({
          ...o,
          isCorrect: o.id === correctOptionId,
        }))
        : undefined;

    onSubmit({
      question: question.trim(),
      type: type as QuestionType,
      language: language.trim(),
      subLanguage: subLanguages.join(", "),
      company: company.trim() || undefined,
      difficulty: (difficulty as Difficulty) || undefined,
      answer: answer.trim() || undefined,
      codeSnippet: type === "practical" ? codeSnippet.trim() || undefined : undefined,
      options: formattedOptions,
      correctOptionId: type === "mcq" ? correctOptionId : undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <HelpCircle className="h-5 w-5 text-primary shrink-0" />
              {editingQuestion ? "Edit Question" : "Add New Question"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-5 py-3">
            {/* Question Statement */}
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label htmlFor="question" className="font-semibold text-xs">
                  Question Statement *
                </Label>
                {suggestions.length > 0 && (
                  <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> {suggestions.length} similar existing
                  </span>
                )}
              </div>
              <Textarea
                id="question"
                placeholder="e.g. What is the difference between UseState and UseRef in React?"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                required
                rows={3}
                className="text-xs leading-relaxed"
              />

              {/* Suggestions Popup */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-md border bg-popover p-2 text-popover-foreground shadow-lg">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1 border-b">
                    Similar Existing Questions (Click to auto-fill)
                  </div>
                  <div className="grid gap-1 pt-1 max-h-44 overflow-y-auto">
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="text-left rounded px-2 py-1.5 hover:bg-accent transition-colors flex items-center justify-between gap-2 text-xs"
                        onClick={() => handleSelectSuggestion(item)}
                      >
                        <span className="font-medium truncate flex-1">{item.question}</span>
                        <Badge variant="outline" className="text-[9px] py-0 shrink-0">
                          {item.language}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Question Type & Difficulty */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold text-xs">Question Type *</Label>
                <SearchableSelect
                  options={questionTypeOptions}
                  value={type}
                  onChange={(v) => setType(v as QuestionType)}
                  placeholder="Select Question Type *"
                  searchPlaceholder="Search type..."
                  allowCustom={false}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-xs">Difficulty (Optional)</Label>
                <SearchableSelect
                  options={difficultyOptions}
                  value={difficulty}
                  onChange={(v) => setDifficulty(v as Difficulty)}
                  placeholder="Select Difficulty"
                  searchPlaceholder="Search difficulty..."
                  allowCustom={false}
                />
              </div>
            </div>

            {/* Language & Sub Language */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold text-xs">Language / Tech Stack *</Label>
                <SearchableSelect
                  options={languageOptions}
                  value={language}
                  onChange={(v) => setLanguage(v)}
                  placeholder="Select Language / Tech *"
                  searchPlaceholder="Search or type tech stack..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-xs">Sub Lang / Topic Categories</Label>
                <SearchableMultiSelect
                  options={subLanguageOptions}
                  values={subLanguages}
                  onChange={(v) => setSubLanguages(v)}
                  placeholder="Select topics/categories..."
                  searchPlaceholder="Search or type topic category..."
                  allowCustom={true}
                />
              </div>
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label className="font-semibold text-xs flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" /> Company Name (Optional)
              </Label>
              <SearchableSelect
                options={companyOptions}
                value={company}
                onChange={(v) => setCompany(v)}
                placeholder="Select applied company or type custom..."
                searchPlaceholder="Search company or type new..."
                allowCustom={true}
              />
            </div>

            {/* MCQ Options */}
            {type === "mcq" && (
              <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-xs uppercase tracking-wider">
                    MCQ Options & Correct Answer
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={handleAddOption}
                  >
                    <Plus className="h-3 w-3" /> Add Choice
                  </Button>
                </div>

                <div className="space-y-2">
                  {mcqOptions.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={correctOptionId === opt.id}
                        onChange={() => setCorrectOptionId(opt.id)}
                        className="h-4 w-4 text-primary cursor-pointer accent-primary"
                        title="Mark as correct answer"
                      />
                      <span className="font-mono text-xs w-5 font-semibold text-muted-foreground">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <Input
                        placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                        value={opt.text}
                        onChange={(e) =>
                          handleOptionTextChange(opt.id, e.target.value)
                        }
                        className="flex-1 h-9 text-xs"
                        required={type === "mcq"}
                      />
                      {mcqOptions.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleRemoveOption(opt.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Code Snippet */}
            {type === "practical" && (
              <div className="space-y-2">
                <Label htmlFor="codeSnippet" className="font-semibold text-xs">
                  Code Snippet / Problem Starter
                </Label>
                <Textarea
                  id="codeSnippet"
                  placeholder="Paste starter code or code snippet..."
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  className="font-mono text-xs"
                  rows={4}
                />
              </div>
            )}

            {/* Answer / Notes */}
            <div className="space-y-2">
              <Label htmlFor="answer" className="font-semibold text-xs">
                Answer & Solution Notes (Optional)
              </Label>
              <Textarea
                id="answer"
                placeholder="Explanation, key concepts, or ideal answer approach..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={3}
                className="text-xs"
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
            <Button type="submit" disabled={!question.trim() || !type || !language}>
              {editingQuestion ? "Save Changes" : "Add Question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
