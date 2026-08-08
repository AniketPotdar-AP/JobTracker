import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  ExternalLink,
  Building2,
  Calendar,
  User,
  Plus,
  FileQuestion,
  CheckCircle2,
  XCircle,
  Clock,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { useInterviewsStore, getInterviewQuestions } from "@/store/useInterviews";
import { useApplicationsStore } from "@/store/useApplications";
import { QuestionCard } from "@/components/questions/QuestionCard";
import { InterviewFormModal } from "@/components/interviews/InterviewFormModal";
import { QuestionFormModal } from "@/components/questions/QuestionFormModal";
import type { QuestionItem } from "@/types/interviews";
import { cn, formatNiceDate } from "@/lib/utils";

export const Route = createFileRoute("/interviews/$id")({
  head: () => ({
    meta: [
      { title: "Interview Details — JobTrack" },
      {
        name: "description",
        content: "View full interview round details, interviewer info, and questions asked.",
      },
    ],
  }),
  component: InterviewDetailsPage,
  notFoundComponent: () => (
    <div className="py-16 text-center">
      <h2 className="text-lg font-semibold">Interview not found</h2>
      <Link
        to="/interviews"
        className="mt-3 inline-block text-sm text-primary hover:underline"
      >
        Back to interviews
      </Link>
    </div>
  ),
});

function SortableQuestionCard({
  question,
  index,
  onEdit,
  onDelete,
}: {
  question: QuestionItem;
  index: number;
  onEdit: (item: QuestionItem) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex gap-2 sm:gap-3 items-start group/qitem transition-shadow",
        isDragging && "opacity-60 shadow-lg rounded-lg border border-primary/40 bg-accent/40"
      )}
    >
      <div className="flex flex-col items-center gap-1.5 pt-3 shrink-0">
        <Badge
          variant="outline"
          className="text-[11px] font-mono font-bold text-muted-foreground px-1.5 py-0.5"
        >
          #{index + 1}
        </Badge>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing hover:bg-muted transition-colors border border-transparent hover:border-border"
          title="Drag to reorder question position"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <QuestionCard
          question={question}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

function InterviewDetailsPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const appsLoading = useApplicationsStore((s) => s.loading);
  const interview = useInterviewsStore((s) =>
    s.interviews.find(
      (i) =>
        i.id === id ||
        (i.aliasIds && i.aliasIds.includes(id)) ||
        decodeURIComponent(i.id) === decodeURIComponent(id) ||
        (i.aliasIds && i.aliasIds.some((a) => decodeURIComponent(a) === decodeURIComponent(id))) ||
        i.id.toLowerCase() === id.toLowerCase() ||
        (i.applicationId && i.applicationId === id),
    ),
  );
  const standaloneQuestions = useInterviewsStore((s) => s.standaloneQuestions);
  const updateInterview = useInterviewsStore((s) => s.updateInterview);
  const deleteInterview = useInterviewsStore((s) => s.deleteInterview);
  const addQuestionToInterview = useInterviewsStore((s) => s.addQuestionToInterview);
  const updateQuestion = useInterviewsStore((s) => s.updateQuestion);
  const deleteQuestion = useInterviewsStore((s) => s.deleteQuestion);
  const reorderInterviewQuestions = useInterviewsStore((s) => s.reorderInterviewQuestions);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [addQuestionOpen, setAddQuestionOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);

  const displayQuestions = useMemo(() => {
    if (!interview) return [];
    return getInterviewQuestions(interview, standaloneQuestions);
  }, [interview, standaloneQuestions]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !interview) return;

    const oldIndex = displayQuestions.findIndex((q) => q.id === active.id);
    const newIndex = displayQuestions.findIndex((q) => q.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      reorderInterviewQuestions(interview.id, oldIndex, newIndex);
    }
  };

  if (!interview) {
    if (appsLoading) {
      return (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Loading interview details...</p>
        </div>
      );
    }

    return (
      <div className="py-16 text-center">
        <h2 className="text-lg font-semibold">Interview not found</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          The requested interview round could not be found or may have been removed.
        </p>
        <Button variant="outline" size="sm" asChild className="mt-4">
          <Link to="/interviews">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to interviews
          </Link>
        </Button>
      </div>
    );
  }

  const outcomeBadges = {
    passed: (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-xs">
        <CheckCircle2 className="h-3.5 w-3.5" /> Passed
      </Badge>
    ),
    failed: (
      <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1 text-xs">
        <XCircle className="h-3.5 w-3.5" /> Failed
      </Badge>
    ),
    pending: (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-xs">
        <Clock className="h-3.5 w-3.5" /> Scheduled / Pending
      </Badge>
    ),
    completed: (
      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1 text-xs">
        <CheckCircle2 className="h-3.5 w-3.5" /> Completed
      </Badge>
    ),
  };

  return (
    <>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/interviews">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to interviews
          </Link>
        </Button>
      </div>

      {/* Main Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="truncate text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary shrink-0" />
              {interview.company}
            </h1>
            <Badge variant="secondary" className="font-medium text-xs">
              {interview.roundType}
            </Badge>
            {interview.outcome && outcomeBadges[interview.outcome]}
          </div>
          {interview.jobTitle && (
            <p className="text-sm font-medium text-muted-foreground">
              {interview.jobTitle}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditModalOpen(true)}
          >
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            title="Delete interview"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {/* Left Info Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2 border-b bg-muted/20">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Round Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Interview Date</span>
                <span className="font-semibold flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary/70" />
                  {formatNiceDate(interview.interviewDate)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Interviewer</span>
                <span className="font-semibold flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-primary/70" />
                  {interview.interviewerName || "Not specified"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Questions Count</span>
                <Badge variant="secondary" className="font-semibold">
                  {interview.questions.length} questions
                </Badge>
              </div>

              {interview.locationOrUrl && (
                <div className="pt-2">
                  <span className="text-xs text-muted-foreground block mb-1">
                    Interview Recording Link
                  </span>
                  <a
                    href={
                      interview.locationOrUrl.startsWith("http")
                        ? interview.locationOrUrl
                        : `https://${interview.locationOrUrl}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline break-all bg-primary/10 px-2.5 py-1.5 rounded-md w-full"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{interview.locationOrUrl}</span>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {interview.notes && (
            <Card>
              <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Notes & Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {interview.notes}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Questions Column */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">
                Questions Asked ({displayQuestions.length})
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs bg-primary text-white"
              onClick={() => setAddQuestionOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Add Question
            </Button>
          </div>

          {displayQuestions.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <FileQuestion className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <h3 className="text-sm font-semibold">No questions added yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Record technical questions, coding problems, theoretical topics, or MCQs asked in this round.
              </p>
              <Button
                onClick={() => setAddQuestionOpen(true)}
                size="sm"
                className="mt-4 gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add First Question
              </Button>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={displayQuestions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid gap-4">
                  {displayQuestions.map((q, idx) => (
                    <SortableQuestionCard
                      key={q.id}
                      question={q}
                      index={idx}
                      onEdit={(item) => setEditingQuestion(item)}
                      onDelete={(qId) => deleteQuestion(qId, interview.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <InterviewFormModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        editingInterview={interview}
        onSubmit={(patch) => {
          updateInterview(interview.id, patch);
          setEditModalOpen(false);
        }}
      />

      {/* Add Question Modal */}
      <QuestionFormModal
        open={addQuestionOpen}
        onOpenChange={setAddQuestionOpen}
        defaultCompany={interview.company}
        onSubmit={(qData) => {
          addQuestionToInterview(interview.id, qData);
          setAddQuestionOpen(false);
        }}
      />

      {/* Edit Question Modal */}
      {editingQuestion && (
        <QuestionFormModal
          open={!!editingQuestion}
          onOpenChange={(open) => !open && setEditingQuestion(null)}
          editingQuestion={editingQuestion}
          onSubmit={(patch) => {
            updateQuestion(editingQuestion.id, patch);
            setEditingQuestion(null);
          }}
        />
      )}

      {/* Delete Confirmation Alert */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Interview Record?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this interview record and all its questions? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteInterview(interview.id);
                void navigate({ to: "/interviews" });
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
