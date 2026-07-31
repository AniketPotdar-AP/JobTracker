export type Status =
  | "applied"
  | "recruiter_call"
  | "assessment"
  | "l1_interview"
  | "l2_interview"
  | "l3_interview"
  | "hr_interview"
  | "on_hold"
  | "rejected"
  | "ghosted"
  | "position_filled"
  | "offer"
  | "joined";

export const STATUS_ORDER: Status[] = [
  "applied",
  "recruiter_call",
  "assessment",
  "l1_interview",
  "l2_interview",
  "l3_interview",
  "hr_interview",
  "on_hold",
  "rejected",
  "ghosted",
  "position_filled",
  "offer",
  "joined",
];

export const STATUS_LABEL: Record<Status, string> = {
  applied: "Applied",
  recruiter_call: "Recruiter call",
  assessment: "Assesment",
  l1_interview: "L1 Interview",
  l2_interview: "L2 Interview",
  l3_interview: "L3 interview",
  hr_interview: "HR interview",
  on_hold: "On Hold",
  rejected: "Rejected",
  ghosted: "Ghosted",
  position_filled: "Position Filled",
  offer: "Offer",
  joined: "Joined",
};

// Tailwind classes for status pills (light + dark friendly).
export const STATUS_CLASS: Record<Status, string> = {
  applied: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200/60 dark:border-blue-500/20",
  recruiter_call: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-500/20",
  assessment: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300 border-cyan-200/60 dark:border-cyan-500/20",
  l1_interview: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300 border-violet-200/60 dark:border-violet-500/20",
  l2_interview: "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300 border-purple-200/60 dark:border-purple-500/20",
  l3_interview: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 border-fuchsia-200/60 dark:border-fuchsia-500/20",
  hr_interview: "bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300 border-pink-200/60 dark:border-pink-500/20",
  on_hold: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200/60 dark:border-amber-500/20",
  rejected: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300 border-red-200/60 dark:border-red-500/20",
  ghosted: "bg-slate-200 text-slate-700 dark:bg-slate-600/25 dark:text-slate-300 border-slate-300/60 dark:border-slate-500/20",
  position_filled: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300 border-orange-200/60 dark:border-orange-500/20", offer: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-500/20",
  joined: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300 border-green-200/60 dark:border-green-500/20",
};

export const ACTUAL_INTERVIEW_STATUSES: Status[] = [
  "assessment",
  "l1_interview",
  "l2_interview",
  "l3_interview",
  "hr_interview",
];

export const INTERVIEW_STATUSES: Status[] = [
  "recruiter_call",
  ...ACTUAL_INTERVIEW_STATUSES,
];

export const IN_PROGRESS_STATUSES: Status[] = ["applied", ...INTERVIEW_STATUSES, "on_hold"];

export const SOURCES = [
  "LinkedIn",
  "Naukri",
  "Indeed",
  "Company Portal",
  "Consultancy",
  "Referral",
  "AngelList",
  "Glassdoor",
  "Other",
];

export type Priority = "low" | "medium" | "high";
export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
export const PRIORITY_CLASS: Record<Priority, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-500",
  high: "bg-red-500",
};

export type WorkMode = "remote" | "hybrid" | "onsite";
export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
};

/** Quick-pick locations offered in the application form (free text still allowed). */
export const LOCATION_SUGGESTIONS = [
  "Hinjewadi",
  "Remote",
  "Yerwada",
  "Bavdhan",
  "Baner",
  "Kharadi",
  "Viman Nagar",
  "Magarpatta",
  "Pune",
];

/** Quick-pick resume names offered in the application form (free text still allowed). */
export const RESUME_SUGGESTIONS = ["Angular resume", "React resume", "Fullstack resume"];

/** Quick-pick position names offered in the application form (free text still allowed). */
export const POSITION_SUGGESTIONS = ["Angular Developer", "Frontend Developer", "React Developer", "Full Stack Developer", "Node.js Developer"];

