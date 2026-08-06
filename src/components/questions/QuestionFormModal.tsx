import { useEffect, useState } from "react";
import { Plus, Trash2, HelpCircle } from "lucide-react";
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
import type { MCQOption, QuestionItem, QuestionType, Difficulty } from "@/types/interviews";
import { PRESET_LANGUAGES, PRESET_SUB_LANGUAGES } from "@/types/interviews";
import { nanoid } from "nanoid";

type QuestionFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<QuestionItem, "id" | "dateAdded">) => void;
  editingQuestion?: QuestionItem | null;
};

export function QuestionFormModal({
  open,
  onOpenChange,
  onSubmit,
  editingQuestion,
}: QuestionFormModalProps) {
  const [question, setQuestion] = useState("");
  const [type, setType] = useState<QuestionType>("theoretical");
  const [language, setLanguage] = useState("React");
  const [customLanguage, setCustomLanguage] = useState("");
  const [subLanguage, setSubLanguage] = useState("Arrays");
  const [customSubLanguage, setCustomSubLanguage] = useState("");
  const [company, setCompany] = useState("");
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

  useEffect(() => {
    if (editingQuestion) {
      setQuestion(editingQuestion.question || "");
      setType(editingQuestion.type || "theoretical");
      
      if (PRESET_LANGUAGES.includes(editingQuestion.language)) {
        setLanguage(editingQuestion.language);
        setCustomLanguage("");
      } else {
        setLanguage("custom");
        setCustomLanguage(editingQuestion.language || "");
      }

      if (PRESET_SUB_LANGUAGES.includes(editingQuestion.subLanguage)) {
        setSubLanguage(editingQuestion.subLanguage);
        setCustomSubLanguage("");
      } else {
        setSubLanguage("custom");
        setCustomSubLanguage(editingQuestion.subLanguage || "");
      }

      setCompany(editingQuestion.company || "");
      setDifficulty(editingQuestion.difficulty || "medium");
      setAnswer(editingQuestion.answer || "");
      setCodeSnippet(editingQuestion.codeSnippet || "");
      if (editingQuestion.options && editingQuestion.options.length > 0) {
        setMcqOptions(editingQuestion.options);
        const correct = editingQuestion.options.find((o) => o.isCorrect)?.id;
        if (correct) setCorrectOptionId(correct);
      }
    } else {
      setQuestion("");
      setType("theoretical");
      setLanguage("React");
      setCustomLanguage("");
      setSubLanguage("Arrays");
      setCustomSubLanguage("");
      setCompany("");
      setDifficulty("medium");
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
  }, [editingQuestion, open]);

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

    onSubmit({
      question: question.trim(),
      type,
      language: finalLanguage,
      subLanguage: finalSubLanguage,
      company: company.trim() || undefined,
      difficulty,
      answer: answer.trim() || undefined,
      codeSnippet: codeSnippet.trim() || undefined,
      options: formattedOptions,
      correctOptionId: type === "mcq" ? correctOptionId : undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              {editingQuestion ? "Edit Question" : "Add New Question"}
            </DialogTitle>
            <DialogDescription>
              Add interview question details, language/framework tags, and answer notes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Question Title */}
            <div className="space-y-1.5">
              <Label htmlFor="question">Question Statement *</Label>
              <Textarea
                id="question"
                placeholder="e.g. What is the difference between UseState and UseRef in React?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                rows={3}
              />
            </div>

            {/* Type & Difficulty */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Question Type</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as QuestionType)}
                >
                  <SelectTrigger>
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

              <div className="space-y-1.5">
                <Label>Difficulty Level</Label>
                <Select
                  value={difficulty}
                  onValueChange={(v) => setDifficulty(v as Difficulty)}
                >
                  <SelectTrigger>
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

            {/* Language & Sub Language */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Language */}
              <div className="space-y-1.5">
                <Label>Language / Framework</Label>
                <Select
                  value={language}
                  onValueChange={(v) => setLanguage(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">+ Other Custom Language</SelectItem>
                  </SelectContent>
                </Select>

                {language === "custom" && (
                  <Input
                    placeholder="Type custom language (e.g. Angular, Tailwind, Rust)"
                    value={customLanguage}
                    onChange={(e) => setCustomLanguage(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

              {/* Sub Language / Category */}
              <div className="space-y-1.5">
                <Label>Sub Lang / Topic Category</Label>
                <Select
                  value={subLanguage}
                  onValueChange={(v) => setSubLanguage(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_SUB_LANGUAGES.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">+ Other Custom Category</SelectItem>
                  </SelectContent>
                </Select>

                {subLanguage === "custom" && (
                  <Input
                    placeholder="Type custom sub-lang (e.g. Arrays, Strings, Flexbox)"
                    value={customSubLanguage}
                    onChange={(e) => setCustomSubLanguage(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            </div>

            {/* Company */}
            <div className="space-y-1.5">
              <Label htmlFor="company">Company Name (Optional)</Label>
              <Input
                id="company"
                placeholder="e.g. Google, TCS, Infosys, Startup"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            {/* MCQ Options Form */}
            {type === "mcq" && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3.5">
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
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
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

            {/* Code Snippet Input */}
            {(type === "practical" || type === "theoretical") && (
              <div className="space-y-1.5">
                <Label htmlFor="codeSnippet">Code Snippet (Optional)</Label>
                <Textarea
                  id="codeSnippet"
                  placeholder={`// Code snippet or algorithm solution...\nfunction example() {\n  return true;\n}`}
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                />
              </div>
            )}

            {/* Answer & Explanation */}
            <div className="space-y-1.5">
              <Label htmlFor="answer">Answer & Explanation Notes</Label>
              <Textarea
                id="answer"
                placeholder="Model answer, step-by-step solution, complexity analysis, or key points to remember..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={3}
              />
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
              {editingQuestion ? "Save Changes" : "Add Question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
