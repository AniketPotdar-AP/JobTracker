import type { Application } from "@/store/useApplications";
import type { InterviewRecord, QuestionItem } from "@/types/interviews";

export type ImportStats = {
  applications: number;
  interviews: number;
  questions: number;
};

export async function processSmartJsonImport(
  jsonText: string,
  handlers: {
    importApplications: (apps: Application[]) => Promise<void>;
    importInterviews: (ivs: InterviewRecord[]) => Promise<void>;
    importQuestions: (qs: QuestionItem[]) => Promise<void>;
  },
): Promise<ImportStats> {
  const parsed = JSON.parse(jsonText);
  const stats: ImportStats = { applications: 0, interviews: 0, questions: 0 };

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return stats;
    const sample = parsed[0];

    // Check if Question
    if (sample.question && (sample.type || sample.language)) {
      await handlers.importQuestions(parsed as QuestionItem[]);
      stats.questions = parsed.length;
    }
    // Check if Interview
    else if (sample.roundType || sample.interviewDate) {
      await handlers.importInterviews(parsed as InterviewRecord[]);
      stats.interviews = parsed.length;
    }
    // Default to Applications
    else {
      await handlers.importApplications(parsed as Application[]);
      stats.applications = parsed.length;
    }
  } else if (typeof parsed === "object" && parsed !== null) {
    if (Array.isArray(parsed.applications) && parsed.applications.length > 0) {
      await handlers.importApplications(parsed.applications);
      stats.applications = parsed.applications.length;
    }
    if (Array.isArray(parsed.interviews) && parsed.interviews.length > 0) {
      await handlers.importInterviews(parsed.interviews);
      stats.interviews = parsed.interviews.length;
    }
    if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      await handlers.importQuestions(parsed.questions);
      stats.questions = parsed.questions.length;
    }
    if (Array.isArray(parsed.standaloneQuestions) && parsed.standaloneQuestions.length > 0) {
      await handlers.importQuestions(parsed.standaloneQuestions);
      stats.questions += parsed.standaloneQuestions.length;
    }
  } else {
    throw new Error("Invalid JSON format");
  }

  return stats;
}
