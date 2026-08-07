import type { Application } from "@/store/useApplications";
import type { InterviewRecord, QuestionItem } from "@/types/interviews";
import { STATUS_LABEL } from "@/lib/status";
import { fmtDate } from "@/lib/format";

function applicationToRow(a: Application) {
  return {
    Company: a.company,
    Role: a.title,
    Status: STATUS_LABEL[a.status] ?? a.status,
    Location: a.location ?? "",
    "Work mode": a.workMode,
    Source: a.source,
    "Applied date": fmtDate(a.appliedDate, "yyyy-MM-dd"),
    "Interview date": a.interviewDate ? fmtDate(a.interviewDate, "yyyy-MM-dd") : "",
    "Follow-up date": a.followUpDate ? fmtDate(a.followUpDate, "yyyy-MM-dd") : "",
    "Rejection date": a.rejectionDate ? fmtDate(a.rejectionDate, "yyyy-MM-dd") : "",
    Salary: a.salary ?? "",
    Recruiter: a.recruiterName ?? "",
    "Recruiter email": a.recruiterEmail ?? "",
    "Recruiter phone": a.recruiterPhone ?? "",
    "Job URL": a.jobUrl ?? "",
    Resume: a.resumeUsed ?? "",
    Notes: a.notes ?? "",
    "Last updated": fmtDate(a.updatedAt, "yyyy-MM-dd"),
  };
}

function interviewToRow(iv: InterviewRecord) {
  return {
    Company: iv.company,
    "Job Title": iv.jobTitle ?? "",
    "Round Type": iv.roundType,
    "Interview Date": iv.interviewDate ? fmtDate(iv.interviewDate, "yyyy-MM-dd") : "",
    "Interviewer Name": iv.interviewerName ?? "",
    Outcome: iv.outcome ?? "completed",
    "Location / Link": iv.locationOrUrl ?? "",
    "Questions Count": iv.questions?.length ?? 0,
    Notes: iv.notes ?? "",
  };
}

function questionToRow(q: QuestionItem) {
  return {
    Question: q.question,
    Type: q.type,
    Language: q.language,
    "Sub Language": q.subLanguage ?? "",
    Difficulty: q.difficulty ?? "",
    Company: q.company ?? "",
    "Job Title": q.jobTitle ?? "",
    "Round Type": q.roundType ?? "",
    "Asked Count": q.askedCount ?? 1,
    Answer: q.answer ?? "",
    "Code Snippet": q.codeSnippet ?? "",
    "Date Added": q.dateAdded ?? "",
    Notes: q.notes ?? "",
  };
}

export async function exportApplicationsToXlsx(
  applications: Application[],
  owner: string,
) {
  const XLSX = await import("xlsx");
  const rows = applications.map(applicationToRow);
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = Object.keys(rows[0] ?? {}).map((k) => ({
    wch: Math.min(40, Math.max(12, k.length + 4)),
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Applications");
  const safeOwner = owner.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  XLSX.writeFile(
    book,
    `jobtrack-applications-${safeOwner}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

export async function exportInterviewsToXlsx(
  interviews: InterviewRecord[],
  owner: string,
) {
  const XLSX = await import("xlsx");
  const rows = interviews.map(interviewToRow);
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = Object.keys(rows[0] ?? {}).map((k) => ({
    wch: Math.min(40, Math.max(12, k.length + 4)),
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Interviews");
  const safeOwner = owner.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  XLSX.writeFile(
    book,
    `jobtrack-interviews-${safeOwner}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

export async function exportQuestionsToXlsx(
  questions: QuestionItem[],
  owner: string,
) {
  const XLSX = await import("xlsx");
  const rows = questions.map(questionToRow);
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = Object.keys(rows[0] ?? {}).map((k) => ({
    wch: Math.min(40, Math.max(12, k.length + 4)),
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Questions");
  const safeOwner = owner.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  XLSX.writeFile(
    book,
    `jobtrack-questions-${safeOwner}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

export async function exportFullBackupToXlsx(
  applications: Application[],
  interviews: InterviewRecord[],
  questions: QuestionItem[],
  owner: string,
) {
  const XLSX = await import("xlsx");
  const book = XLSX.utils.book_new();

  const appRows = applications.map(applicationToRow);
  const appSheet = XLSX.utils.json_to_sheet(appRows);
  appSheet["!cols"] = Object.keys(appRows[0] ?? {}).map((k) => ({
    wch: Math.min(40, Math.max(12, k.length + 4)),
  }));
  XLSX.utils.book_append_sheet(book, appSheet, "Applications");

  const ivRows = interviews.map(interviewToRow);
  const ivSheet = XLSX.utils.json_to_sheet(ivRows);
  ivSheet["!cols"] = Object.keys(ivRows[0] ?? {}).map((k) => ({
    wch: Math.min(40, Math.max(12, k.length + 4)),
  }));
  XLSX.utils.book_append_sheet(book, ivSheet, "Interviews");

  const qRows = questions.map(questionToRow);
  const qSheet = XLSX.utils.json_to_sheet(qRows);
  qSheet["!cols"] = Object.keys(qRows[0] ?? {}).map((k) => ({
    wch: Math.min(40, Math.max(12, k.length + 4)),
  }));
  XLSX.utils.book_append_sheet(book, qSheet, "Questions");

  const safeOwner = owner.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  XLSX.writeFile(
    book,
    `jobtrack-full-backup-${safeOwner}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
