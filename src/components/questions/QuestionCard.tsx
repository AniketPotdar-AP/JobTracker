import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Pencil,
  Trash2,
  Check,
  Building2,
  Calendar,
  Code2,
  FileText,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { QuestionItem } from "@/types/interviews";
import {
  QUESTION_TYPE_CLASSES,
  QUESTION_TYPE_LABELS,
} from "@/types/interviews";

type QuestionCardProps = {
  question: QuestionItem;
  onEdit?: (question: QuestionItem) => void;
  onDelete?: (id: string) => void;
};

export function QuestionCard({ question, onEdit, onDelete }: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyQuestion = () => {
    void navigator.clipboard.writeText(question.question);
    setCopied(true);
    toast.success("Question copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    if (!question.codeSnippet) return;
    void navigator.clipboard.writeText(question.codeSnippet);
    setCopiedCode(true);
    toast.success("Code snippet copied");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const difficultyColors = {
    easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-500/20",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200/60 dark:border-amber-500/20",
    hard: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 border-rose-200/60 dark:border-rose-500/20",
  };

  return (
    <Card className="group relative flex flex-col transition-all duration-200 hover:shadow-md border-border/80 bg-card/60 backdrop-blur-sm">
      <CardHeader className="p-4 pb-3 space-y-3">
        {/* Header Tags & Metadata */}
        <div className="flex flex-wrap items-center gap-1.5 justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Question Type Badge */}
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
                QUESTION_TYPE_CLASSES[question.type],
              )}
            >
              {QUESTION_TYPE_LABELS[question.type]}
            </span>

            {/* Language / Tech Stack Tag */}
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
              <Code2 className="mr-1 h-3 w-3" />
              {question.language}
            </Badge>

            {/* Sub language / Category Tag */}
            <Badge variant="outline" className="text-xs bg-muted/50 border-muted-foreground/20">
              {question.subLanguage}
            </Badge>

            {/* Difficulty Badge if set */}
            {question.difficulty && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                  difficultyColors[question.difficulty],
                )}
              >
                {question.difficulty}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleCopyQuestion}
              title="Copy question text"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(question)}
                title="Edit question"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(question.id)}
                title="Delete question"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Company & Context Meta */}
        {(question.company || question.roundType || question.dateAdded) && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
            {question.company && (
              <span className="flex items-center gap-1 font-medium text-foreground/80">
                <Building2 className="h-3 w-3 text-primary/70" />
                {question.company}
              </span>
            )}
            {question.roundType && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                {question.roundType}
              </span>
            )}
            {question.dateAdded && (
              <span className="flex items-center gap-1 text-[11px]">
                <Calendar className="h-3 w-3" />
                {question.dateAdded}
              </span>
            )}
          </div>
        )}

        {/* Question Title Statement */}
        <h3 className="text-base font-semibold text-foreground leading-snug pt-1">
          {question.question}
        </h3>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-1 space-y-3">
        {/* MCQ Choices Preview */}
        {question.type === "mcq" && question.options && question.options.length > 0 && (
          <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Options:
            </span>
            <div className="grid gap-1.5">
              {question.options.map((opt, idx) => {
                const isCorrect =
                  opt.id === question.correctOptionId || opt.isCorrect;
                return (
                  <div
                    key={opt.id || idx}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-1.5 text-xs border transition-colors",
                      showAnswer && isCorrect
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-medium"
                        : "bg-background border-border/60 text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-muted-foreground text-[11px]">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      {opt.text}
                    </span>
                    {showAnswer && isCorrect && (
                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3 w-3 mr-0.5" /> Correct Answer
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Code Snippet Block */}
        {question.codeSnippet && (
          <div className="relative rounded-lg border bg-slate-950 text-slate-100 p-3 text-xs font-mono overflow-x-auto">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400">
              <span>Code Snippet ({question.language})</span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copiedCode ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="whitespace-pre-wrap leading-relaxed">{question.codeSnippet}</pre>
          </div>
        )}

        {/* Answer / Solution Expandable Content */}
        {showAnswer && (question.answer || question.notes) && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 space-y-1.5 text-xs text-foreground animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-1.5 font-semibold text-primary text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Answer & Solution Notes</span>
            </div>
            <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed pt-1">
              {question.answer}
            </div>
            {question.notes && (
              <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground italic">
                Note: {question.notes}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {(question.answer || question.notes || question.type === "mcq") && (
        <CardFooter className="p-3 pt-0 border-t bg-muted/20 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-xs text-muted-foreground hover:text-foreground h-8"
            onClick={() => setShowAnswer(!showAnswer)}
          >
            <span>{showAnswer ? "Hide Answer & Explanation" : "Show Answer & Explanation"}</span>
            {showAnswer ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
