import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Copy,
  Check,
  Building2,
  Calendar,
  Code2,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useInterviewsStore } from "@/store/useInterviews";
import { QuestionFormModal } from "@/components/questions/QuestionFormModal";
import {
  QUESTION_TYPE_CLASSES,
  QUESTION_TYPE_LABELS,
} from "@/types/interviews";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/questions/$id")({
  head: () => ({
    meta: [
      { title: "Question Details — JobTrack" },
      {
        name: "description",
        content: "View full question text, type, language, solution, code snippet, or MCQ breakdown.",
      },
    ],
  }),
  component: QuestionDetailsPage,
  notFoundComponent: () => (
    <div className="py-16 text-center">
      <h2 className="text-lg font-semibold">Question not found</h2>
      <Link
        to="/questions"
        className="mt-3 inline-block text-sm text-primary hover:underline"
      >
        Back to questions bank
      </Link>
    </div>
  ),
});

function QuestionDetailsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const getAllQuestions = useInterviewsStore((s) => s.getAllQuestions);
  const updateQuestion = useInterviewsStore((s) => s.updateQuestion);
  const deleteQuestion = useInterviewsStore((s) => s.deleteQuestion);

  const question = getAllQuestions().find((q) => q.id === id);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copiedQuestion, setCopiedQuestion] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!question) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-lg font-semibold">Question not found</h2>
        <Link
          to="/questions"
          className="mt-3 inline-block text-sm text-primary hover:underline"
        >
          Back to questions bank
        </Link>
      </div>
    );
  }

  const handleCopyQuestion = () => {
    void navigator.clipboard.writeText(question.question);
    setCopiedQuestion(true);
    toast.success("Question copied to clipboard");
    setTimeout(() => setCopiedQuestion(false), 2000);
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
    <>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/questions">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to questions
          </Link>
        </Button>
      </div>

      {/* Main Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b pb-5">
        <div className="space-y-3 min-w-0 flex-1">
          {/* Badges Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
                QUESTION_TYPE_CLASSES[question.type],
              )}
            >
              {QUESTION_TYPE_LABELS[question.type]}
            </span>

            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <Code2 className="mr-1 h-3.5 w-3.5" />
              {question.language}
            </Badge>

            <Badge variant="outline" className="text-xs">
              {question.subLanguage}
            </Badge>

            {question.difficulty && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                  difficultyColors[question.difficulty],
                )}
              >
                {question.difficulty}
              </span>
            )}

            {question.company && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Building2 className="h-3 w-3 text-primary" />
                {question.company}
              </Badge>
            )}

            {question.dateAdded && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto sm:ml-0">
                <Calendar className="h-3.5 w-3.5" />
                {question.dateAdded}
              </span>
            )}
          </div>

          {/* Large High-Visibility Question Statement */}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
            {question.question}
          </h1>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyQuestion}
            className="gap-1.5 text-xs"
          >
            {copiedQuestion ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedQuestion ? "Copied" : "Copy Text"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            className="gap-1 text-xs"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:text-destructive h-9 w-9"
            onClick={() => setConfirmDelete(true)}
            title="Delete question"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Details Grid */}
      <div className="mt-6 space-y-6 max-w-4xl">
        {/* MCQ Choices Breakdown */}
        {question.type === "mcq" && question.options && question.options.length > 0 && (
          <Card>
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                Multiple Choice Options
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {question.options.map((opt, idx) => {
                const isCorrect =
                  opt.id === question.correctOptionId || opt.isCorrect;
                return (
                  <div
                    key={opt.id || idx}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-4 py-3 text-sm border transition-colors",
                      isCorrect
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-semibold"
                        : "bg-background border-border/60 text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className="font-mono font-bold text-muted-foreground w-6 text-sm">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      {opt.text}
                    </span>
                    {isCorrect && (
                      <span className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full">
                        <Check className="h-3.5 w-3.5 mr-1" /> Correct Answer
                      </span>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Code Snippet Viewer */}
        {question.codeSnippet && (
          <Card className="overflow-hidden border-slate-800 bg-slate-950 text-slate-100">
            <CardHeader className="p-4 border-b border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                Code Solution ({question.language})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-slate-300 hover:text-white hover:bg-slate-800"
                onClick={handleCopyCode}
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedCode ? "Copied Snippet" : "Copy Code"}
              </Button>
            </CardHeader>
            <CardContent className="p-4 font-mono text-sm overflow-x-auto">
              <pre className="whitespace-pre-wrap leading-relaxed">{question.codeSnippet}</pre>
            </CardContent>
          </Card>
        )}

        {/* Solution & Explanation Block */}
        {(question.answer || question.notes) && (
          <Card>
            <CardHeader className="p-4 border-b bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                Solution Explanation & Key Takeaways
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {question.answer && (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {question.answer}
                </div>
              )}
              {question.notes && (
                <div className="pt-3 border-t text-xs text-muted-foreground italic">
                  Additional Note: {question.notes}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Modal */}
      <QuestionFormModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        editingQuestion={question}
        onSubmit={(patch) => {
          updateQuestion(question.id, patch);
          setEditModalOpen(false);
        }}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this question from your bank? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteQuestion(question.id);
                void navigate({ to: "/questions" });
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
