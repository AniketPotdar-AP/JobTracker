import type { Application } from "@/store/useApplications";
import { STATUS_LABEL } from "@/lib/status";
import { fmtDate } from "@/lib/format";

/** Builds a flat, spreadsheet-friendly row for one application. */
function toRow(a: Application) {
  return {
    Company: a.company,
    Role: a.title,
    Status: STATUS_LABEL[a.status] ?? a.status,
    Location: a.location ?? "",
    "Work mode": a.workMode,
    Source: a.source,
    "Applied date": fmtDate(a.appliedDate, "yyyy-MM-dd"),
    "Interview date": a.interviewDate
      ? fmtDate(a.interviewDate, "yyyy-MM-dd")
      : "",
    "Follow-up date": a.followUpDate
      ? fmtDate(a.followUpDate, "yyyy-MM-dd")
      : "",
    "Rejection date": a.rejectionDate
      ? fmtDate(a.rejectionDate, "yyyy-MM-dd")
      : "",
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

export async function exportApplicationsToXlsx(
  applications: Application[],
  owner: string,
) {
  const XLSX = await import("xlsx");
  const rows = applications.map(toRow);
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = Object.keys(rows[0] ?? {}).map((k) => ({
    wch: Math.min(40, Math.max(12, k.length + 4)),
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Applications");
  const safeOwner = owner.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  XLSX.writeFile(
    book,
    `jobtrack-${safeOwner}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
