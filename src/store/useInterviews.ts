import { create } from "zustand";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { readLocal, writeLocal } from "@/lib/local-store";
import type { InterviewRecord, QuestionItem } from "@/types/interviews";
import { INTERVIEW_STATUSES, STATUS_LABEL } from "@/lib/status";
import { useApplicationsStore, type Application } from "@/store/useApplications";

import { supabase } from "@/integrations/supabase/client";

const now = () => new Date().toISOString();

const SEED_INTERVIEWS: InterviewRecord[] = [];
const SEED_STANDALONE_QUESTIONS: QuestionItem[] = [];

// Helper to reliably save interviews & standalone questions to localStorage
const persistStore = (
  userId: string | null,
  interviews: InterviewRecord[],
  standaloneQuestions: QuestionItem[],
) => {
  const keyUser = userId || "guest";
  writeLocal(`jat.interviews.${keyUser}`, interviews);
  writeLocal(`jat.questions.${keyUser}`, standaloneQuestions);

  // Also write to guest key as fallback if userId is set
  if (userId && userId !== "guest") {
    writeLocal(`jat.interviews.guest`, interviews);
    writeLocal(`jat.questions.guest`, standaloneQuestions);
  }
};

type InterviewsState = {
  interviews: InterviewRecord[];
  standaloneQuestions: QuestionItem[];
  userId: string | null;

  loadUser: (userId: string) => void;
  unloadUser: () => void;

  syncFromApplications: (applications: Application[]) => void;

  addInterview: (
    data: Omit<InterviewRecord, "id" | "createdAt" | "updatedAt">,
  ) => InterviewRecord;
  updateInterview: (id: string, patch: Partial<InterviewRecord>) => void;
  deleteInterview: (id: string) => void;

  addQuestionToInterview: (
    interviewId: string,
    question: Omit<QuestionItem, "id" | "dateAdded">,
  ) => void;

  addStandaloneQuestion: (
    question: Omit<QuestionItem, "id" | "dateAdded">,
  ) => QuestionItem;
  updateQuestion: (id: string, patch: Partial<QuestionItem>) => void;
  deleteQuestion: (id: string) => void;

  getAllQuestions: () => QuestionItem[];
};

export const useInterviewsStore = create<InterviewsState>()((set, get) => ({
  interviews: SEED_INTERVIEWS,
  standaloneQuestions: SEED_STANDALONE_QUESTIONS,
  userId: null,

  loadUser: (userId) => {
    const keyUser = userId || "guest";
    const ivKey = `jat.interviews.${keyUser}`;
    const qKey = `jat.questions.${keyUser}`;
    let cachedIv = readLocal<InterviewRecord[]>(ivKey);
    let cachedQ = readLocal<QuestionItem[]>(qKey);

    // Fallback to guest storage if user-specific storage is empty
    if ((!cachedIv || cachedIv.length === 0) && keyUser !== "guest") {
      const guestIv = readLocal<InterviewRecord[]>("jat.interviews.guest");
      if (guestIv && Array.isArray(guestIv)) cachedIv = guestIv;
    }
    if ((!cachedQ || cachedQ.length === 0) && keyUser !== "guest") {
      const guestQ = readLocal<QuestionItem[]>("jat.questions.guest");
      if (guestQ && Array.isArray(guestQ)) cachedQ = guestQ;
    }

    set({
      userId: keyUser,
      interviews: cachedIv && Array.isArray(cachedIv) ? cachedIv : SEED_INTERVIEWS,
      standaloneQuestions:
        cachedQ && Array.isArray(cachedQ) ? cachedQ : SEED_STANDALONE_QUESTIONS,
    });

    // Auto-sync from applications state immediately
    const appsState = (useApplicationsStore.getState && useApplicationsStore.getState().applications) || [];
    if (appsState.length > 0) {
      get().syncFromApplications(appsState);
    }

    // Try fetching from Supabase database if authenticated user
    if (userId && userId !== "guest") {
      void (async () => {
        try {
          const [ivRes, qRes] = await Promise.all([
            supabase.from("interviews").select("*").eq("user_id", userId),
            supabase.from("questions").select("*").eq("user_id", userId),
          ]);

          if (!ivRes.error && ivRes.data && ivRes.data.length > 0) {
            const dbIv: InterviewRecord[] = ivRes.data.map((r: any) => ({
              id: r.id,
              applicationId: r.application_id,
              company: r.company,
              jobTitle: r.job_title,
              roundType: r.round_type,
              interviewDate: r.interview_date,
              interviewerName: r.interviewer_name,
              locationOrUrl: r.location_or_url,
              notes: r.notes,
              outcome: r.outcome,
              questions: r.questions || [],
              createdAt: r.created_at,
              updatedAt: r.updated_at,
            }));
            set({ interviews: dbIv });
            persistStore(userId, dbIv, get().standaloneQuestions);
          }

          if (!qRes.error && qRes.data && qRes.data.length > 0) {
            const dbQ: QuestionItem[] = qRes.data.map((r: any) => ({
              id: r.id,
              interviewId: r.interview_id,
              question: r.question,
              type: r.type,
              language: r.language,
              subLanguage: r.sub_language,
              difficulty: r.difficulty,
              company: r.company,
              jobTitle: r.job_title,
              roundType: r.round_type,
              askedCount: r.asked_count,
              answer: r.answer,
              codeSnippet: r.code_snippet,
              notes: r.notes,
              options: r.options,
              correctOptionIndex: r.correct_option_index,
              dateAdded: r.date_added,
            }));
            set({ standaloneQuestions: dbQ });
            persistStore(userId, get().interviews, dbQ);
          }
        } catch {
          /* Gracefully ignore if Supabase migration script has not been run yet */
        }
      })();
    }
  },

  unloadUser: () => {
    set({ userId: null, interviews: [], standaloneQuestions: [] });
  },

  syncFromApplications: (apps) => {
    let currentInterviews = get().interviews.filter(
      (iv) =>
        iv.roundType !== "Recruiter call" &&
        iv.roundType !== "recruiter_call" &&
        iv.roundType !== "Recruiter Call",
    );
    let changed = currentInterviews.length !== get().interviews.length;

    for (const app of apps) {
      const historyEntries = (app.statusHistory || []).filter(
        (h) => INTERVIEW_STATUSES.includes(h.status) && h.status !== "recruiter_call",
      );

      const allStatusEntries = [...historyEntries];
      if (
        INTERVIEW_STATUSES.includes(app.status) &&
        app.status !== "recruiter_call" &&
        !allStatusEntries.some((e) => e.status === app.status)
      ) {
        allStatusEntries.push({
          status: app.status,
          at: app.interviewDate || app.updatedAt || app.appliedDate || now(),
        });
      }

      for (const entry of allStatusEntries) {
        const roundLabel = STATUS_LABEL[entry.status] || entry.status;
        const entryDate = entry.at
          ? entry.at.slice(0, 10)
          : app.interviewDate || app.appliedDate || now().slice(0, 10);

        const existingIndex = currentInterviews.findIndex(
          (iv) =>
            (iv.applicationId === app.id && iv.roundType === roundLabel) ||
            (iv.company.toLowerCase() === app.company.toLowerCase() &&
              iv.roundType === roundLabel &&
              iv.interviewDate === entryDate),
        );

        if (existingIndex >= 0) {
          const existing = currentInterviews[existingIndex];
          if (
            existing.company !== app.company ||
            existing.jobTitle !== app.title ||
            !existing.applicationId
          ) {
            currentInterviews[existingIndex] = {
              ...existing,
              applicationId: app.id,
              company: app.company,
              jobTitle: app.title,
              updatedAt: now(),
            };
            changed = true;
          }
        } else {
          const newIv: InterviewRecord = {
            id: `iv-${nanoid(8)}`,
            applicationId: app.id,
            company: app.company,
            jobTitle: app.title,
            roundType: roundLabel,
            interviewDate: entryDate,
            interviewerName: app.recruiterName,
            outcome:
              app.status === entry.status
                ? app.status === "rejected"
                  ? "failed"
                  : "completed"
                : "completed",
            notes: `Auto-synced from Application "${app.company} - ${app.title}"`,
            questions: [],
            createdAt: now(),
            updatedAt: now(),
          };
          currentInterviews.unshift(newIv);
          changed = true;
        }
      }
    }

    if (changed) {
      persistStore(get().userId, currentInterviews, get().standaloneQuestions);
      set({ interviews: currentInterviews });
    }
  },

  addInterview: (data) => {
    const id = `iv-${nanoid(8)}`;
    const iv: InterviewRecord = {
      ...data,
      id,
      questions: data.questions || [],
      createdAt: now(),
      updatedAt: now(),
    };
    const next = [iv, ...get().interviews];
    persistStore(get().userId, next, get().standaloneQuestions);
    set({ interviews: next });
    toast.success("Interview logged successfully");
    return iv;
  },

  updateInterview: (id, patch) => {
    const next = get().interviews.map((iv) =>
      iv.id === id ? { ...iv, ...patch, updatedAt: now() } : iv,
    );
    persistStore(get().userId, next, get().standaloneQuestions);
    set({ interviews: next });
    toast.success("Interview updated");
  },

  deleteInterview: (id) => {
    const next = get().interviews.filter((iv) => iv.id !== id);
    persistStore(get().userId, next, get().standaloneQuestions);
    set({ interviews: next });
    toast.success("Interview deleted");
  },

  addQuestionToInterview: (interviewId, qData) => {
    const qId = `q-${nanoid(8)}`;
    const targetIv = get().interviews.find((i) => i.id === interviewId);
    if (!targetIv) return;

    const newQ: QuestionItem = {
      ...qData,
      id: qId,
      interviewId,
      company: qData.company || targetIv.company,
      jobTitle: qData.jobTitle || targetIv.jobTitle,
      roundType: qData.roundType || targetIv.roundType,
      dateAdded: targetIv.interviewDate || new Date().toISOString().slice(0, 10),
    };

    const nextInterviews = get().interviews.map((iv) =>
      iv.id === interviewId
        ? { ...iv, questions: [newQ, ...iv.questions], updatedAt: now() }
        : iv,
    );

    persistStore(get().userId, nextInterviews, get().standaloneQuestions);
    set({ interviews: nextInterviews });
    toast.success("Question added to interview");

    const userId = get().userId;
    if (userId && userId !== "guest") {
      void supabase.from("questions").upsert({
        id: newQ.id,
        user_id: userId,
        interview_id: newQ.interviewId || null,
        question: newQ.question,
        type: newQ.type,
        language: newQ.language,
        sub_language: newQ.subLanguage || null,
        difficulty: newQ.difficulty || null,
        company: newQ.company || null,
        job_title: newQ.jobTitle || null,
        round_type: newQ.roundType || null,
        asked_count: newQ.askedCount || 1,
        answer: newQ.answer || null,
        code_snippet: newQ.codeSnippet || null,
        notes: newQ.notes || null,
        options: newQ.options || null,
        correct_option_index: newQ.correctOptionIndex ?? null,
        date_added: newQ.dateAdded,
      }).then(() => {}, () => {});
    }
  },

  addStandaloneQuestion: (qData) => {
    const id = `q-${nanoid(8)}`;
    const newQ: QuestionItem = {
      ...qData,
      id,
      dateAdded: new Date().toISOString().slice(0, 10),
    };
    const next = [newQ, ...get().standaloneQuestions];
    persistStore(get().userId, get().interviews, next);
    set({ standaloneQuestions: next });
    toast.success("Question added to bank");

    const userId = get().userId;
    if (userId && userId !== "guest") {
      void supabase.from("questions").upsert({
        id: newQ.id,
        user_id: userId,
        interview_id: newQ.interviewId || null,
        question: newQ.question,
        type: newQ.type,
        language: newQ.language,
        sub_language: newQ.subLanguage || null,
        difficulty: newQ.difficulty || null,
        company: newQ.company || null,
        job_title: newQ.jobTitle || null,
        round_type: newQ.roundType || null,
        asked_count: newQ.askedCount || 1,
        answer: newQ.answer || null,
        code_snippet: newQ.codeSnippet || null,
        notes: newQ.notes || null,
        options: newQ.options || null,
        correct_option_index: newQ.correctOptionIndex ?? null,
        date_added: newQ.dateAdded,
      }).then(() => {}, () => {});
    }
    return newQ;
  },

  updateQuestion: (id, patch) => {
    let updatedInIv = false;
    const nextIv = get().interviews.map((iv) => {
      const qIndex = iv.questions.findIndex((q) => q.id === id);
      if (qIndex >= 0) {
        updatedInIv = true;
        const updatedQs = [...iv.questions];
        updatedQs[qIndex] = { ...updatedQs[qIndex], ...patch };
        return { ...iv, questions: updatedQs, updatedAt: now() };
      }
      return iv;
    });

    if (updatedInIv) {
      persistStore(get().userId, nextIv, get().standaloneQuestions);
      set({ interviews: nextIv });
      toast.success("Question updated");
      return;
    }

    const nextQ = get().standaloneQuestions.map((q) =>
      q.id === id ? { ...q, ...patch } : q,
    );
    persistStore(get().userId, get().interviews, nextQ);
    set({ standaloneQuestions: nextQ });
    toast.success("Question updated");
  },

  deleteQuestion: (id) => {
    const nextIv = get().interviews.map((iv) => ({
      ...iv,
      questions: iv.questions.filter((q) => q.id !== id),
    }));

    const nextQ = get().standaloneQuestions.filter((q) => q.id !== id);

    persistStore(get().userId, nextIv, nextQ);
    set({ interviews: nextIv, standaloneQuestions: nextQ });
    toast.success("Question removed");
  },

  getAllQuestions: () => {
    const rawIvQuestions = get()
      .interviews.filter(
        (iv) =>
          iv.roundType !== "Recruiter call" &&
          iv.roundType !== "recruiter_call" &&
          iv.roundType !== "Recruiter Call",
      )
      .flatMap((iv) =>
        iv.questions.map((q) => ({
          ...q,
          company: q.company || iv.company,
          jobTitle: q.jobTitle || iv.jobTitle,
          roundType: q.roundType || iv.roundType,
          interviewId: iv.id,
        })),
      );

    const allRaw = [...rawIvQuestions, ...get().standaloneQuestions];
    const groupedMap = new Map<string, QuestionItem>();

    for (const q of allRaw) {
      const key = q.question.trim().toLowerCase();
      if (groupedMap.has(key)) {
        const existing = groupedMap.get(key)!;
        const count = (existing.askedCount || 1) + (q.askedCount || 1);
        const companiesSet = new Set([
          ...(existing.companiesAsked || (existing.company ? [existing.company] : [])),
          ...(q.company ? [q.company] : []),
        ]);
        groupedMap.set(key, {
          ...existing,
          askedCount: count,
          companiesAsked: Array.from(companiesSet),
          answer: existing.answer || q.answer,
          codeSnippet: existing.codeSnippet || q.codeSnippet,
        });
      } else {
        groupedMap.set(key, {
          ...q,
          askedCount: q.askedCount || 1,
          companiesAsked: q.companiesAsked || (q.company ? [q.company] : []),
        });
      }
    }

    return Array.from(groupedMap.values());
  },
}));
