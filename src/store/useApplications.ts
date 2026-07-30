import { create } from "zustand";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { INTERVIEW_STATUSES, STATUS_LABEL, type Priority, type Status, type WorkMode } from "@/lib/status";
import { readLocal, storageKeys, writeLocal } from "@/lib/local-store";
import { supabase } from "@/integrations/supabase/client";

export type Interview = {
  id: string;
  type: string;
  at: string;
  notes?: string;
};

export type ActivityEntry = {
  id: string;
  at: string;
  kind: "created" | "updated" | "status" | "note" | "interview" | "archived" | "duplicated";
  message: string;
};

export type Application = {
  id: string;
  company: string;
  title: string;
  location?: string;
  workMode: WorkMode;
  appliedDate: string;
  status: Status;
  source: string;
  recruiterName?: string;
  recruiterEmail?: string;
  jobUrl?: string;
  salary?: string;
  resumeUsed?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  interviewDate?: string;
  followUpDate?: string;
  rejectionDate?: string;
  notes?: string;
  priority: Priority;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  statusHistory: { status: Status; at: string }[];
  interviews: Interview[];
  activity: ActivityEntry[];
};

const now = () => new Date().toISOString();

type NewApp = Omit<
  Application,
  "id" | "createdAt" | "updatedAt" | "statusHistory" | "interviews" | "activity" | "archived"
> & { archived?: boolean };

/* ------------------------------------------------------------------ */
/* Row <-> domain mapping                                              */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

function fromRow(r: Row): Application {
  return {
    id: r.id as string,
    company: (r.company as string) ?? "",
    title: (r.title as string) ?? "",
    location: (r.location as string) ?? undefined,
    workMode: ((r.work_mode as WorkMode) ?? "remote") as WorkMode,
    appliedDate: (r.applied_date as string) ?? now(),
    status: ((r.status as Status) ?? "applied") as Status,
    source: (r.source as string) ?? "Other",
    recruiterName: (r.recruiter_name as string) ?? undefined,
    recruiterEmail: (r.recruiter_email as string) ?? undefined,
    jobUrl: (r.job_url as string) ?? undefined,
    salary: (r.salary as string) ?? undefined,
    resumeUsed: (r.resume_used as string) ?? undefined,
    portfolioUrl: (r.portfolio_url as string) ?? undefined,
    githubUrl: (r.github_url as string) ?? undefined,
    linkedinUrl: (r.linkedin_url as string) ?? undefined,
    interviewDate: (r.interview_date as string) ?? undefined,
    followUpDate: (r.follow_up_date as string) ?? undefined,
    rejectionDate: (r.rejection_date as string) ?? undefined,
    notes: (r.notes as string) ?? undefined,
    priority: ((r.priority as Priority) ?? "medium") as Priority,
    archived: Boolean(r.archived),
    createdAt: (r.created_at as string) ?? now(),
    updatedAt: (r.updated_at as string) ?? now(),
    statusHistory: (r.status_history as Application["statusHistory"]) ?? [],
    interviews: (r.interviews as Interview[]) ?? [],
    activity: (r.activity as ActivityEntry[]) ?? [],
  };
}

/** Maps a partial domain object to snake_case columns (only defined keys). */
function toRow(patch: Partial<Application>): Row {
  const map: Record<string, string> = {
    company: "company",
    title: "title",
    location: "location",
    workMode: "work_mode",
    appliedDate: "applied_date",
    status: "status",
    source: "source",
    recruiterName: "recruiter_name",
    recruiterEmail: "recruiter_email",
    jobUrl: "job_url",
    salary: "salary",
    resumeUsed: "resume_used",
    portfolioUrl: "portfolio_url",
    githubUrl: "github_url",
    linkedinUrl: "linkedin_url",
    interviewDate: "interview_date",
    followUpDate: "follow_up_date",
    rejectionDate: "rejection_date",
    notes: "notes",
    priority: "priority",
    archived: "archived",
    statusHistory: "status_history",
    interviews: "interviews",
    activity: "activity",
  };
  const out: Row = {};
  for (const [k, col] of Object.entries(map)) {
    if (k in patch) {
      const v = (patch as Row)[k];
      out[col] = v ?? null;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

type State = {
  applications: Application[];
  theme: "light" | "dark";
  hasHydrated: boolean;
  loading: boolean;
  userId: string | null;
  add: (data: NewApp, customStatusDateIso?: string) => Promise<Application | undefined>;
  update: (id: string, patch: Partial<Application>, customDateIso?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  archive: (id: string, archived?: boolean) => Promise<void>;
  setStatus: (id: string, status: Status, statusDateIso?: string) => Promise<void>;
  addInterview: (id: string, interview: Omit<Interview, "id">) => Promise<void>;
  clearAll: () => Promise<void>;
  importData: (data: Application[]) => Promise<void>;
  setTheme: (t: "light" | "dark") => void;
  hydrateTheme: () => void;
  loadUser: (userId: string) => Promise<void>;
  unloadUser: () => void;
};

const table = () => supabase.from("applications" as never);

export const useApplicationsStore = create<State>()((set, get) => {
  const fail = (e: unknown, msg: string) => {
    console.error(msg, e);
    toast.error(msg);
  };

  const refresh = async () => {
    const userId = get().userId;
    if (!userId) return;
    const { data, error } = await table()
      .select("*")
      .order("applied_date", { ascending: false });
    if (error) {
      fail(error, "Could not load your applications.");
      return;
    }
    const apps = ((data as unknown as Row[]) ?? []).map(fromRow);
    writeLocal(`jat.apps.${userId}`, apps);
    set({ applications: apps });
  };

  return {
    applications: [],
    theme: "light",
    hasHydrated: false,
    loading: false,
    userId: null,

    loadUser: async (userId) => {
      const cacheKey = `jat.apps.${userId}`;
      const cached = readLocal<Application[]>(cacheKey);
      if (cached && Array.isArray(cached)) {
        set({ userId, applications: cached, hasHydrated: true, loading: false });
      } else {
        set({ userId, loading: true });
      }
      await refresh();
      set({ loading: false, hasHydrated: true });
    },
    unloadUser: () => set({ userId: null, applications: [], hasHydrated: false }),

    hydrateTheme: () => {
      const theme = readLocal<"light" | "dark">(storageKeys.theme) ?? "light";
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", theme === "dark");
      }
      set({ theme });
    },
    setTheme: (theme) => {
      writeLocal(storageKeys.theme, theme);
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", theme === "dark");
      }
      set({ theme });
    },

    add: async (data, customStatusDateIso) => {
      const userId = get().userId;
      if (!userId) return undefined;
      const t = customStatusDateIso ?? now();
      const payload = {
        ...toRow({ ...data, archived: data.archived ?? false }),
        user_id: userId,
        status_history: [{ status: data.status, at: t }],
        activity: [
          { id: nanoid(6), at: t, kind: "created", message: `Added ${data.company} — ${data.title}` },
        ],
        interviews: [],
      };
      const { data: row, error } = await table().insert(payload as never).select("*").single();
      if (error) {
        fail(error, "Could not save the application.");
        return undefined;
      }
      const app = fromRow(row as unknown as Row);
      const apps = [app, ...get().applications];
      if (userId) writeLocal(`jat.apps.${userId}`, apps);
      set({ applications: apps });
      return app;
    },

    update: async (id, patch, customDateIso) => {
      const current = get().applications.find((a) => a.id === id);
      if (!current) return;
      const t = customDateIso ?? now();
      const statusChanged = !!patch.status && patch.status !== current.status;
      const entry: ActivityEntry = statusChanged
        ? { id: nanoid(6), at: t, kind: "status", message: `Status changed to ${STATUS_LABEL[patch.status!] ?? patch.status}` }
        : { id: nanoid(6), at: t, kind: "updated", message: "Updated details" };
      const next: Application = {
        ...current,
        ...patch,
        updatedAt: now(),
        statusHistory: patch.statusHistory
          ? patch.statusHistory
          : statusChanged
            ? [...current.statusHistory, { status: patch.status!, at: t }]
            : current.statusHistory,
        activity: [entry, ...current.activity].slice(0, 50),
      };
      const apps = get().applications.map((a) => (a.id === id ? next : a));
      const userId = get().userId;
      if (userId) writeLocal(`jat.apps.${userId}`, apps);
      set({ applications: apps });
      const { error } = await table()
        .update(toRow(next) as never)
        .eq("id", id);
      if (error) {
        fail(error, "Could not update the application.");
        await refresh();
      }
    },

    remove: async (id) => {
      const prev = get().applications;
      const next = prev.filter((a) => a.id !== id);
      const userId = get().userId;
      if (userId) writeLocal(`jat.apps.${userId}`, next);
      set({ applications: next });
      const { error } = await table().delete().eq("id", id);
      if (error) {
        fail(error, "Could not delete the application.");
        set({ applications: prev });
      }
    },

    duplicate: async (id) => {
      const src = get().applications.find((a) => a.id === id);
      if (!src) return;
      const { id: _id, createdAt: _c, updatedAt: _u, statusHistory: _s, interviews: _i, activity: _a, ...rest } = src;
      await get().add({ ...rest, company: `${src.company} (copy)` });
    },

    archive: async (id, archived) => {
      const src = get().applications.find((a) => a.id === id);
      if (!src) return;
      await get().update(id, { archived: archived ?? !src.archived });
    },

    setStatus: async (id, status, statusDateIso) => {
      const current = get().applications.find((a) => a.id === id);
      if (!current) return;
      const t = statusDateIso ?? now();
      const extraPatch: Partial<Application> = {};
      if (INTERVIEW_STATUSES.includes(status)) {
        extraPatch.interviewDate = t;
      } else if (status === "rejected" || status === "ghosted") {
        extraPatch.rejectionDate = t;
      }
      await get().update(id, { status, ...extraPatch }, t);
    },

    addInterview: async (id, interview) => {
      const src = get().applications.find((a) => a.id === id);
      if (!src) return;
      const iv: Interview = { ...interview, id: nanoid(6) };
      const entry: ActivityEntry = {
        id: nanoid(6),
        at: now(),
        kind: "interview",
        message: `Interview scheduled: ${interview.type}`,
      };
      const next: Application = {
        ...src,
        interviews: [iv, ...src.interviews],
        interviewDate: interview.at,
        updatedAt: now(),
        activity: [entry, ...src.activity].slice(0, 50),
      };
      set({ applications: get().applications.map((a) => (a.id === id ? next : a)) });
      const { error } = await table()
        .update({ interviews: next.interviews, interview_date: next.interviewDate, activity: next.activity } as never)
        .eq("id", id);
      if (error) {
        fail(error, "Could not save the interview.");
        await refresh();
      }
    },

    clearAll: async () => {
      const userId = get().userId;
      if (!userId) return;
      const { error } = await table().delete().eq("user_id", userId);
      if (error) {
        fail(error, "Could not clear your data.");
        return;
      }
      set({ applications: [] });
    },

    importData: async (data) => {
      const userId = get().userId;
      if (!userId) return;
      const rows = data.map((a) => ({
        ...toRow(a),
        user_id: userId,
        status_history: a.statusHistory ?? [],
        interviews: a.interviews ?? [],
        activity: a.activity ?? [],
      }));
      const { error } = await table().insert(rows as never);
      if (error) {
        fail(error, "Could not import the data.");
        return;
      }
      await refresh();
    },
  };
});
