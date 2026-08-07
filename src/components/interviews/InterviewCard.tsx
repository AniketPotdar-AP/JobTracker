import { Link } from "@tanstack/react-router";
import {
  Building2,
  Calendar,
  User,
  Plus,
  Pencil,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import type { InterviewRecord, QuestionItem } from "@/types/interviews";
import { formatNiceDate } from "@/lib/utils";

type InterviewCardProps = {
  interview: InterviewRecord;
  onEdit: (interview: InterviewRecord) => void;
  onDelete: (id: string) => void;
  onAddQuestion: (interviewId: string) => void;
  onEditQuestion?: (question: QuestionItem) => void;
  onDeleteQuestion?: (questionId: string) => void;
};

export function InterviewCard({
  interview,
  onEdit,
  onDelete,
  onAddQuestion,
}: InterviewCardProps) {
  const outcomeBadges = {
    passed: (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
        <CheckCircle2 className="h-3 w-3" /> Passed
      </Badge>
    ),
    failed: (
      <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1">
        <XCircle className="h-3 w-3" /> Failed
      </Badge>
    ),
    pending: (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1">
        <Clock className="h-3 w-3" /> Scheduled
      </Badge>
    ),
    completed: (
      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1">
        <CheckCircle2 className="h-3 w-3" /> Completed
      </Badge>
    ),
  };

  return (
    <Card className="overflow-hidden border-border/80 bg-card/60 backdrop-blur-sm transition-all duration-200 hover:shadow-md">
      {/* Header Banner */}
      <CardHeader className="p-4 sm:p-5 space-y-3 bg-muted/20 border-b">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/interviews/$id"
                params={{ id: interview.id }}
                className="group flex items-center gap-2"
              >
                <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  {interview.company}
                </h3>
              </Link>
              <Badge variant="secondary" className="font-medium text-xs">
                {interview.roundType}
              </Badge>
              {interview.outcome && outcomeBadges[interview.outcome]}
            </div>
            {interview.jobTitle && (
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                {interview.jobTitle}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              asChild
            >
              <Link to="/interviews/$id" params={{ id: interview.id }}>
                <Eye className="h-3.5 w-3.5" /> View Details
              </Link>
            </Button>
            {/* <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => onAddQuestion(interview.id)}
            >
              <Plus className="h-3.5 w-3.5" /> Add Question
            </Button> */}
            {/* <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(interview)}
              title="Edit interview"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(interview.id)}
              title="Delete interview"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button> */}
          </div>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
          {interview.interviewDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary/70" />
              {formatNiceDate(interview.interviewDate)}
            </span>
          )}
          {interview.interviewerName && (
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-primary/70" />
              Interviewer: {interview.interviewerName}
            </span>
          )}
          {interview.locationOrUrl && (
            <a
              href={interview.locationOrUrl.startsWith("http") ? interview.locationOrUrl : `https://${interview.locationOrUrl}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Interview Recording Link
            </a>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
