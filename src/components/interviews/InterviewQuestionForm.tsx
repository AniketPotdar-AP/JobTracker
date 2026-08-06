import { useState, useMemo } from "react";
import { Plus, HelpCircle, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect, type Option } from "@/components/ui/searchable-select";
import { SearchableMultiSelect, type MultiOption } from "@/components/ui/searchable-multi-select";
import type { QuestionItem, QuestionType, Difficulty, MCQOption } from "@/types/interviews";
import { PRESET_LANGUAGES, PRESET_SUB_LANGUAGES } from "@/types/interviews";
import { useInterviewsStore } from "@/store/useInterviews";
import { nanoid } from "nanoid";

type InterviewQuestionFormProps = {
  onAddQuestion: (q: Omit<QuestionItem, "id" | "dateAdded">) => void;
};

export function InterviewQuestionForm({ onAddQuestion }: InterviewQuestionFormProps) {
  const getAllQuestions = useInterviewsStore((s) => s.getAllQuestions);
  const existingQuestions = useMemo(() => getAllQuestions(), [getAllQuestions]);

  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [type, setType] = useState<QuestionType | "">("");
  const [language, setLanguage] = useState("");
  const [subLanguages, setSubLanguages] = useState<string[]>([]);
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

  // Options for searchable dropdowns
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

  // Auto-suggestions popup
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = useMemo(() => {
    if (!question.trim() || question.trim().length < 2) return [];
    const q = question.toLowerCase();
    return existingQuestions
      .filter((item) => item.question.toLowerCase().includes(q))
      .slice(0, 4);
  }, [question, existingQuestions]);

  const resetForm = () => {
    setQuestion("");
    setType("");
    setLanguage("");
    setSubLanguages([]);
    setDifficulty("");
    setAnswer("");
    setCodeSnippet("");
    setShowSuggestions(false);
    setIsOpen(false);
  };

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

  const handleAdd = () => {
    if (!question.trim() || !type || !language) return;

    const formattedOptions =
      type === "mcq"
        ? mcqOptions.map((o) => ({
            ...o,
            isCorrect: o.id === correctOptionId,
          }))
        : undefined;

    onAddQuestion({
      question: question.trim(),
      type: type as QuestionType,
      language: language.trim(),
      subLanguage: subLanguages.join(", "),
      difficulty: (difficulty as Difficulty) || undefined,
      answer: answer.trim() || undefined,
      codeSnippet: type === "practical" ? codeSnippet.trim() || undefined : undefined,
      options: formattedOptions,
      correctOptionId: type === "mcq" ? correctOptionId : undefined,
    });

    resetForm();
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full border-dashed gap-1.5 text-xs h-9 text-muted-foreground hover:text-foreground hover:border-primary/50"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" /> Add Question Asked in this Interview
      </Button>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3.5 shadow-sm text-xs relative">
      <div className="flex items-center justify-between border-b pb-2">
        <span className="font-semibold text-xs flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-primary" /> Add Question Asked
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-[11px]"
          onClick={resetForm}
        >
          Cancel
        </Button>
      </div>

      {/* Question Title Statement */}
      <div className="space-y-1 relative">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Question Statement *</Label>
          {suggestions.length > 0 && (
            <span className="text-[10px] text-primary font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> {suggestions.length} similar existing
            </span>
          )}
        </div>
        <Textarea
          placeholder="e.g. What is event delegation in JavaScript?"
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="text-xs"
          rows={2}
        />

        {/* Auto-suggestions list */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-md border bg-popover p-2 text-popover-foreground shadow-lg">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1 border-b">
              Similar Existing Questions
            </div>
            <div className="grid gap-1 pt-1 max-h-36 overflow-y-auto">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="text-left rounded px-2 py-1 hover:bg-accent transition-colors flex items-center justify-between gap-2 text-xs"
                  onClick={() => handleSelectSuggestion(item)}
                >
                  <span className="truncate font-medium">{item.question}</span>
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
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Question Type *</Label>
          <SearchableSelect
            options={questionTypeOptions}
            value={type}
            onChange={(v) => setType(v as QuestionType)}
            placeholder="Search & select Type *"
            searchPlaceholder="Search type..."
            allowCustom={false}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Difficulty (Optional)</Label>
          <SearchableSelect
            options={difficultyOptions}
            value={difficulty}
            onChange={(v) => setDifficulty(v as Difficulty)}
            placeholder="Search & select Difficulty"
            searchPlaceholder="Search difficulty..."
            allowCustom={false}
          />
        </div>
      </div>

      {/* Language & Sub Language */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Language / Framework *</Label>
          <SearchableSelect
            options={languageOptions}
            value={language}
            onChange={(v) => setLanguage(v)}
            placeholder="Search or type tech *"
            searchPlaceholder="Search or type language..."
            allowCustom={true}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Sub Lang / Topic Categories</Label>
          <SearchableMultiSelect
            options={subLanguageOptions}
            values={subLanguages}
            onChange={(v) => setSubLanguages(v)}
            placeholder="Select topics..."
            searchPlaceholder="Search or type topic..."
            allowCustom={true}
          />
        </div>
      </div>

      {/* MCQ Options */}
      {type === "mcq" && (
        <div className="space-y-2 rounded border bg-muted/20 p-2.5">
          <div className="flex items-center justify-between">
            <Label className="font-semibold text-[11px]">MCQ Options</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-[10px] gap-1"
              onClick={handleAddOption}
            >
              <Plus className="h-3 w-3" /> Add Choice
            </Button>
          </div>
          {mcqOptions.map((opt, idx) => (
            <div key={opt.id} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="correctOptionForm"
                checked={correctOptionId === opt.id}
                onChange={() => setCorrectOptionId(opt.id)}
                className="h-3.5 w-3.5 text-primary cursor-pointer accent-primary"
              />
              <span className="font-mono text-[10px] w-4 font-semibold text-muted-foreground">
                {String.fromCharCode(65 + idx)}.
              </span>
              <Input
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                value={opt.text}
                onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                className="h-8 text-xs flex-1"
              />
              {mcqOptions.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleRemoveOption(opt.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Code Snippet for Practical */}
      {type === "practical" && (
        <div className="space-y-1">
          <Label className="text-xs">Code Snippet (Optional)</Label>
          <Textarea
            placeholder="Paste code snippet..."
            value={codeSnippet}
            onChange={(e) => setCodeSnippet(e.target.value)}
            className="font-mono text-xs"
            rows={3}
          />
        </div>
      )}

      {/* Answer Notes */}
      <div className="space-y-1">
        <Label className="text-xs">Answer & Notes (Optional)</Label>
        <Textarea
          placeholder="Answer notes..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={2}
          className="text-xs"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!question.trim() || !type || !language}
          className="h-8 text-xs gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> Save Question Draft
        </Button>
      </div>
    </div>
  );
}
