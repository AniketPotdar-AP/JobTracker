import { useState } from "react";
import { Plus, Trash2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { QuestionItem, QuestionType, Difficulty, MCQOption } from "@/types/interviews";
import { PRESET_LANGUAGES, PRESET_SUB_LANGUAGES } from "@/types/interviews";
import { nanoid } from "nanoid";

type InterviewQuestionFormProps = {
  onAddQuestion: (q: Omit<QuestionItem, "id" | "dateAdded">) => void;
};

export function InterviewQuestionForm({ onAddQuestion }: InterviewQuestionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [type, setType] = useState<QuestionType>("theoretical");
  const [language, setLanguage] = useState("React");
  const [customLanguage, setCustomLanguage] = useState("");
  const [subLanguage, setSubLanguage] = useState("Arrays");
  const [customSubLanguage, setCustomSubLanguage] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [answer, setAnswer] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [mcqOptions, setMcqOptions] = useState<MCQOption[]>([
    { id: "opt-a", text: "", isCorrect: true },
    { id: "opt-b", text: "", isCorrect: false },
    { id: "opt-c", text: "", isCorrect: false },
    { id: "opt-d", text: "", isCorrect: false },
  ]);
  const [correctOptionId, setCorrectOptionId] = useState("opt-a");

  const resetForm = () => {
    setQuestion("");
    setType("theoretical");
    setLanguage("React");
    setCustomLanguage("");
    setSubLanguage("Arrays");
    setCustomSubLanguage("");
    setDifficulty("medium");
    setAnswer("");
    setCodeSnippet("");
    setIsOpen(false);
  };

  const handleAdd = () => {
    if (!question.trim()) return;

    const finalLanguage =
      language === "custom" ? customLanguage.trim() || "General" : language;
    const finalSubLanguage =
      subLanguage === "custom"
        ? customSubLanguage.trim() || "General"
        : subLanguage;

    const formattedOptions =
      type === "mcq"
        ? mcqOptions.map((o) => ({
            ...o,
            isCorrect: o.id === correctOptionId,
          }))
        : undefined;

    onAddQuestion({
      question: question.trim(),
      type,
      language: finalLanguage,
      subLanguage: finalSubLanguage,
      difficulty,
      answer: answer.trim() || undefined,
      codeSnippet: codeSnippet.trim() || undefined,
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
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 space-y-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold flex items-center gap-1.5 text-primary">
          <HelpCircle className="h-3.5 w-3.5" /> Add Interview Question
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px]"
          onClick={resetForm}
        >
          Cancel
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Question Statement *</Label>
        <Input
          placeholder="e.g. Implement a debounce function in JS"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="h-8 text-xs bg-background"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px]">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="theoretical">Theoretical</SelectItem>
              <SelectItem value="practical">Practical / Coding</SelectItem>
              <SelectItem value="scenario">Scenario Based</SelectItem>
              <SelectItem value="mcq">MCQ Based</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[11px]">Language / Tech</Label>
          <Select value={language} onValueChange={(v) => setLanguage(v)}>
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
              <SelectItem value="custom">+ Custom</SelectItem>
            </SelectContent>
          </Select>
          {language === "custom" && (
            <Input
              placeholder="e.g. React, Angular"
              value={customLanguage}
              onChange={(e) => setCustomLanguage(e.target.value)}
              className="h-7 text-xs mt-1 bg-background"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px]">Sub Lang / Topic</Label>
          <Select value={subLanguage} onValueChange={(v) => setSubLanguage(v)}>
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_SUB_LANGUAGES.map((sub) => (
                <SelectItem key={sub} value={sub}>
                  {sub}
                </SelectItem>
              ))}
              <SelectItem value="custom">+ Custom</SelectItem>
            </SelectContent>
          </Select>
          {subLanguage === "custom" && (
            <Input
              placeholder="e.g. Arrays, Strings"
              value={customSubLanguage}
              onChange={(e) => setCustomSubLanguage(e.target.value)}
              className="h-7 text-xs mt-1 bg-background"
            />
          )}
        </div>

        <div>
          <Label className="text-[11px]">Difficulty</Label>
          <Select
            value={difficulty}
            onValueChange={(v) => setDifficulty(v as Difficulty)}
          >
            <SelectTrigger className="h-8 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-[11px]">Answer / Solution (Optional)</Label>
        <Textarea
          placeholder="Model answer or code explanation..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={2}
          className="text-xs bg-background min-h-[60px]"
        />
      </div>

      <div className="flex justify-end gap-1.5 pt-1">
        <Button
          type="button"
          size="sm"
          className="h-7 text-xs"
          onClick={handleAdd}
        >
          Add to Interview
        </Button>
      </div>
    </div>
  );
}
