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

            // Sync dbQ questions into corresponding interviews
            const mergedIv = get().interviews.map((iv) => {
              const matchingQ = dbQ.filter(
                (q) =>
                  q.interviewId === iv.id ||
                  (q.company &&
                    q.company.trim().toLowerCase() === iv.company.trim().toLowerCase()),
              );
              if (matchingQ.length === 0) return iv;
              const existingIds = new Set(iv.questions.map((q) => q.id));
              const newQuestions = [...iv.questions];
              for (const mq of matchingQ) {
                if (!existingIds.has(mq.id)) {
                  newQuestions.push(mq);
                }
              }
              return { ...iv, questions: newQuestions };
            });

            set({ standaloneQuestions: dbQ, interviews: mergedIv });
            persistStore(userId, mergedIv, dbQ);
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
    let currentInterviews = [...get().interviews];
    let changed = false;

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
          date: app.interviewDate || app.updatedAt || app.createdAt,
        });
      }

      for (const entry of allStatusEntries) {
        const roundLabel = STATUS_LABEL[entry.status] || "Interview Round";
        const dateVal =
          entry.date || app.interviewDate || new Date().toISOString().slice(0, 10);

        const existing = currentInterviews.find(
          (iv) =>
            iv.company.toLowerCase() === app.company.toLowerCase() &&
            (iv.roundType === roundLabel || iv.applicationId === app.id),
        );

        if (!existing) {
          const newIv: InterviewRecord = {
            id: `iv-${nanoid(8)}`,
            applicationId: app.id,
            company: app.company,
            jobTitle: app.jobTitle,
            roundType: roundLabel,
            interviewDate: dateVal.slice(0, 10),
            interviewerName: app.interviewerName,
            locationOrUrl: app.notes,
            outcome:
              app.status === "rejected"
                ? "failed"
                : app.status === "offer" || app.status === "joined"
                  ? "passed"
                  : "completed",
            notes: app.notes,
            questions: [],
            createdAt: now(),
            updatedAt: now(),
          };
          currentInterviews.push(newIv);
          changed = true;
        } else {
          let updated = false;
          const patch: Partial<InterviewRecord> = {};

          if (!existing.applicationId) {
            patch.applicationId = app.id;
            updated = true;
          }
          if (app.jobTitle && existing.jobTitle !== app.jobTitle) {
            patch.jobTitle = app.jobTitle;
            updated = true;
          }

          if (updated) {
            currentInterviews = currentInterviews.map((iv) =>
              iv.id === existing.id ? { ...iv, ...patch, updatedAt: now() } : iv,
            );
            changed = true;
          }
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
    const userId = get().userId;
    const next = get().interviews.filter((iv) => iv.id !== id);
    persistStore(userId, next, get().standaloneQuestions);
    set({ interviews: next });
    toast.success("Interview deleted");

    if (userId && userId !== "guest") {
      void supabase.from("interviews").delete().eq("id", id).then(() => {}, () => {});
      void supabase.from("questions").delete().eq("interview_id", id).then(() => {}, () => {});
    }
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

    const nextStandalone = [newQ, ...get().standaloneQuestions.filter((q) => q.id !== qId)];

    persistStore(get().userId, nextInterviews, nextStandalone);
    set({ interviews: nextInterviews, standaloneQuestions: nextStandalone });
    toast.success("Question added to interview");

    const userId = get().userId;
    if (userId && userId !== "guest") {
      const updatedIv = nextInterviews.find((i) => i.id === interviewId);
      if (updatedIv) {
        void supabase
          .from("interviews")
          .update({
            questions: updatedIv.questions,
            updated_at: now(),
          })
          .eq("id", interviewId)
          .then(() => {}, () => {});
      }

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

    let nextInterviews = get().interviews;
    if (newQ.company || newQ.interviewId) {
      nextInterviews = nextInterviews.map((iv) => {
        const matchById = newQ.interviewId && iv.id === newQ.interviewId;
        const matchByComp =
          newQ.company &&
          iv.company.trim().toLowerCase() === newQ.company.trim().toLowerCase();
        if (matchById || matchByComp) {
          if (!iv.questions.some((q) => q.id === newQ.id)) {
            return { ...iv, questions: [newQ, ...iv.questions], updatedAt: now() };
          }
        }
        return iv;
      });
    }

    const nextQ = [newQ, ...get().standaloneQuestions];
    persistStore(get().userId, nextInterviews, nextQ);
    set({ interviews: nextInterviews, standaloneQuestions: nextQ });
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
    let targetIvId: string | null = null;
    let updatedQuestion: QuestionItem | null = null;

    const nextIv = get().interviews.map((iv) => {
      const qIndex = iv.questions.findIndex((q) => q.id === id);
      if (qIndex >= 0) {
        updatedInIv = true;
        targetIvId = iv.id;
        const updatedQs = [...iv.questions];
        updatedQs[qIndex] = { ...updatedQs[qIndex], ...patch };
        updatedQuestion = updatedQs[qIndex];
        return { ...iv, questions: updatedQs, updatedAt: now() };
      }
      return iv;
    });

    const userId = get().userId;

    if (updatedInIv) {
      persistStore(userId, nextIv, get().standaloneQuestions);
      set({ interviews: nextIv });
      toast.success("Question updated");

      if (userId && userId !== "guest" && targetIvId && updatedQuestion) {
        const targetIv = nextIv.find((iv) => iv.id === targetIvId);
        if (targetIv) {
          void supabase
            .from("interviews")
            .update({
              questions: targetIv.questions,
              updated_at: now(),
            })
            .eq("id", targetIvId)
            .then(() => {}, () => {});
        }
        const q: QuestionItem = updatedQuestion;
        void supabase
          .from("questions")
          .upsert({
            id: q.id,
            user_id: userId,
            interview_id: q.interviewId || null,
            question: q.question,
            type: q.type,
            language: q.language,
            sub_language: q.subLanguage || null,
            difficulty: q.difficulty || null,
            company: q.company || null,
            job_title: q.jobTitle || null,
            round_type: q.roundType || null,
            asked_count: q.askedCount || 1,
            answer: q.answer || null,
            code_snippet: q.codeSnippet || null,
            notes: q.notes || null,
            options: q.options || null,
            correct_option_index: q.correctOptionIndex ?? null,
            date_added: q.dateAdded,
          })
          .then(() => {}, () => {});
      }
      return;
    }

    const nextQ = get().standaloneQuestions.map((q) => {
      if (q.id === id) {
        updatedQuestion = { ...q, ...patch };
        return updatedQuestion;
      }
      return q;
    });

    persistStore(userId, get().interviews, nextQ);
    set({ standaloneQuestions: nextQ });
    toast.success("Question updated");

    if (userId && userId !== "guest" && updatedQuestion) {
      const q: QuestionItem = updatedQuestion;
      void supabase
        .from("questions")
        .upsert({
          id: q.id,
          user_id: userId,
          interview_id: q.interviewId || null,
          question: q.question,
          type: q.type,
          language: q.language,
          sub_language: q.subLanguage || null,
          difficulty: q.difficulty || null,
          company: q.company || null,
          job_title: q.jobTitle || null,
          round_type: q.roundType || null,
          asked_count: q.askedCount || 1,
          answer: q.answer || null,
          code_snippet: q.codeSnippet || null,
          notes: q.notes || null,
          options: q.options || null,
          correct_option_index: q.correctOptionIndex ?? null,
          date_added: q.dateAdded,
        })
        .then(() => {}, () => {});
    }
  },

  deleteQuestion: (id) => {
    const userId = get().userId;
    const targetIv = get().interviews.find((iv) =>
      iv.questions.some((q) => q.id === id),
    );

    const nextIv = get().interviews.map((iv) => ({
      ...iv,
      questions: iv.questions.filter((q) => q.id !== id),
    }));

    const nextQ = get().standaloneQuestions.filter((q) => q.id !== id);

    persistStore(userId, nextIv, nextQ);
    set({ interviews: nextIv, standaloneQuestions: nextQ });
    toast.success("Question removed");

    if (userId && userId !== "guest") {
      void supabase
        .from("questions")
        .delete()
        .eq("id", id)
        .then(() => {}, () => {});

      if (targetIv) {
        const updatedQs = targetIv.questions.filter((q) => q.id !== id);
        void supabase
          .from("interviews")
          .update({
            questions: updatedQs,
            updated_at: now(),
          })
          .eq("id", targetIv.id)
          .then(() => {}, () => {});
      }
    }
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
    
    // Deduplicate by question ID first to avoid counting the exact same question object twice
    const uniqueByIdMap = new Map<string, QuestionItem>();
    for (const q of allRaw) {
      if (!uniqueByIdMap.has(q.id)) {
        uniqueByIdMap.set(q.id, q);
      }
    }
    const deduplicatedRaw = Array.from(uniqueByIdMap.values());

    const groupedMap = new Map<string, QuestionItem>();

    for (const q of deduplicatedRaw) {
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
