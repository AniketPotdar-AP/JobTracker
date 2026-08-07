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

// Helpers to format domain models into database row objects
const mapInterviewToRow = (userId: string, iv: InterviewRecord) => ({
  id: iv.id,
  user_id: userId,
  application_id: iv.applicationId || null,
  company: iv.company,
  job_title: iv.jobTitle || null,
  round_type: iv.roundType,
  interview_date: iv.interviewDate,
  interviewer_name: iv.interviewerName || null,
  location_or_url: iv.locationOrUrl || null,
  notes: iv.notes || null,
  outcome: iv.outcome || null,
  questions: (iv.questions || []) as any,
  created_at: iv.createdAt || now(),
  updated_at: iv.updatedAt || now(),
});

const mapQuestionToRow = (userId: string, q: QuestionItem) => ({
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
  options: (q.options || null) as any,
  correct_option_index: (q.correctOptionId as any) ?? null,
  date_added: q.dateAdded || new Date().toISOString().slice(0, 10),
  updated_at: now(),
});

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

export function dedupeInterviews(records: InterviewRecord[]): InterviewRecord[] {
  const result: InterviewRecord[] = [];
  const seenIds = new Set<string>();

  for (const iv of records) {
    if (!iv || !iv.id) continue;
    if (seenIds.has(iv.id)) continue;

    const normCompany = (iv.company || "").trim().toLowerCase();
    const normRound = (iv.roundType || "").trim().toLowerCase();
    const normDate = (iv.interviewDate || "").trim();
    const appId = (iv.applicationId || "").trim();

    const existingIndex = result.findIndex((r) => {
      if (r.id === iv.id) return true;

      const rAppId = (r.applicationId || "").trim();
      const rCompany = (r.company || "").trim().toLowerCase();
      const rRound = (r.roundType || "").trim().toLowerCase();
      const rDate = (r.interviewDate || "").trim();

      if (rAppId && appId && rAppId === appId && rRound && normRound && rRound === normRound) {
        return true;
      }

      if (rCompany && normCompany && rCompany === normCompany && rRound && normRound && rRound === normRound && rDate && normDate && rDate === normDate) {
        return true;
      }

      return false;
    });

    if (existingIndex >= 0) {
      const existing = result[existingIndex];
      const mergedQuestions = [...(existing.questions || [])];
      const existingQIds = new Set(existing.questions.map((q) => q.id));
      for (const q of iv.questions || []) {
        if (!existingQIds.has(q.id)) {
          mergedQuestions.push(q);
        }
      }
      result[existingIndex] = {
        ...existing,
        applicationId: existing.applicationId || iv.applicationId,
        jobTitle: existing.jobTitle || iv.jobTitle,
        interviewerName: existing.interviewerName || iv.interviewerName,
        locationOrUrl: existing.locationOrUrl || iv.locationOrUrl,
        notes: existing.notes || iv.notes,
        outcome: existing.outcome || iv.outcome,
        questions: mergedQuestions,
      };
      seenIds.add(iv.id);
    } else {
      seenIds.add(iv.id);
      result.push(iv);
    }
  }

  return result;
}

const getInitialInterviews = (): InterviewRecord[] => {
  if (typeof window === "undefined") return [];
  const keys = Object.keys(localStorage || {});
  const ivKey = keys.find((k) => k.startsWith("jat.interviews."));
  if (ivKey) {
    const data = readLocal<InterviewRecord[]>(ivKey);
    if (data && Array.isArray(data) && data.length > 0) return dedupeInterviews(data);
  }
  return [];
};

const getInitialQuestions = (): QuestionItem[] => {
  if (typeof window === "undefined") return [];
  const keys = Object.keys(localStorage || {});
  const qKey = keys.find((k) => k.startsWith("jat.questions."));
  if (qKey) {
    const data = readLocal<QuestionItem[]>(qKey);
    if (data && Array.isArray(data) && data.length > 0) return data;
  }
  return [];
};

export const useInterviewsStore = create<InterviewsState>()((set, get) => ({
  interviews: getInitialInterviews(),
  standaloneQuestions: getInitialQuestions(),
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

    const initialDeduped = cachedIv && Array.isArray(cachedIv) ? dedupeInterviews(cachedIv) : SEED_INTERVIEWS;

    set({
      userId: keyUser,
      interviews: initialDeduped,
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
            supabase.from("interviews" as never).select("*").eq("user_id", userId),
            supabase.from("questions" as never).select("*").eq("user_id", userId),
          ]);

          if (!ivRes.error && ivRes.data && ivRes.data.length > 0) {
            const rawDbIv: InterviewRecord[] = ivRes.data.map((r: any) => ({
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

            const dbIv = dedupeInterviews(rawDbIv);

            // Clean up duplicate rows in Supabase DB if raw data contained duplicates
            if (rawDbIv.length > dbIv.length) {
              const keepIds = new Set(dbIv.map((iv) => iv.id));
              const duplicateIdsToDelete = rawDbIv
                .filter((r) => !keepIds.has(r.id))
                .map((r) => r.id);

              if (duplicateIdsToDelete.length > 0) {
                void supabase
                  .from("interviews" as never)
                  .delete()
                  .in("id", duplicateIdsToDelete);
              }
            }

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
            const mergedIv = dedupeInterviews(
              get().interviews.map((iv) => {
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
              }),
            );

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
    let currentInterviews = dedupeInterviews([...get().interviews]);
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
          at: app.interviewDate || app.updatedAt || app.createdAt,
        });
      }

      for (const entry of allStatusEntries) {
        const roundLabel = STATUS_LABEL[entry.status] || "Interview Round";
        const dateVal =
          entry.at || app.interviewDate || new Date().toISOString().slice(0, 10);
        const normCompany = app.company.trim().toLowerCase();
        const normRound = roundLabel.trim().toLowerCase();

        const existing = currentInterviews.find(
          (iv) =>
            (iv.applicationId && iv.applicationId === app.id && iv.roundType.trim().toLowerCase() === normRound) ||
            ((iv.company || "").trim().toLowerCase() === normCompany && iv.roundType.trim().toLowerCase() === normRound),
        );

        if (!existing) {
          const newIv: InterviewRecord = {
            id: `iv-${nanoid(8)}`,
            applicationId: app.id,
            company: app.company,
            jobTitle: app.title,
            roundType: roundLabel,
            interviewDate: dateVal.slice(0, 10),
            interviewerName: app.recruiterName,
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
          if (app.title && existing.jobTitle !== app.title) {
            patch.jobTitle = app.title;
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

    const deduped = dedupeInterviews(currentInterviews);
    if (deduped.length !== get().interviews.length) {
      changed = true;
    }
    currentInterviews = deduped;

    if (changed) {
      persistStore(get().userId, currentInterviews, get().standaloneQuestions);
      set({ interviews: currentInterviews });

      const userId = get().userId;
      if (userId && userId !== "guest") {
        for (const iv of currentInterviews) {
          void supabase
            .from("interviews" as never)
            .upsert(mapInterviewToRow(userId, iv) as never)
            .then(() => {}, () => {});
        }
      }
    }
  },

  addInterview: (data) => {
    const userId = get().userId;
    const id = `iv-${nanoid(8)}`;
    const iv: InterviewRecord = {
      ...data,
      id,
      questions: data.questions || [],
      createdAt: now(),
      updatedAt: now(),
    };
    const next = [iv, ...get().interviews];
    persistStore(userId, next, get().standaloneQuestions);
    set({ interviews: next });
    toast.success("Interview logged successfully");

    if (userId && userId !== "guest") {
      void supabase
        .from("interviews" as never)
        .upsert(mapInterviewToRow(userId, iv) as never)
        .then(() => {}, (err) => console.error("Error creating interview in DB:", err));
    }
    return iv;
  },

  updateInterview: (id, patch) => {
    const userId = get().userId;
    const next = get().interviews.map((iv) =>
      iv.id === id ? { ...iv, ...patch, updatedAt: now() } : iv,
    );
    persistStore(userId, next, get().standaloneQuestions);
    set({ interviews: next });
    toast.success("Interview updated");

    if (userId && userId !== "guest") {
      const updatedIv = next.find((iv) => iv.id === id);
      if (updatedIv) {
        void supabase
          .from("interviews" as never)
          .upsert(mapInterviewToRow(userId, updatedIv) as never)
          .then(() => {}, (err) => console.error("Error updating interview in DB:", err));
      }
    }
  },

  deleteInterview: (id) => {
    const userId = get().userId;
    const next = get().interviews.filter((iv) => iv.id !== id);
    persistStore(userId, next, get().standaloneQuestions);
    set({ interviews: next });
    toast.success("Interview deleted");

    if (userId && userId !== "guest") {
      void supabase.from("interviews" as never).delete().eq("id", id).then(() => {}, () => {});
      void supabase.from("questions" as never).delete().eq("interview_id", id).then(() => {}, () => {});
    }
  },

  addQuestionToInterview: (interviewId, qData) => {
    const userId = get().userId;
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

    persistStore(userId, nextInterviews, nextStandalone);
    set({ interviews: nextInterviews, standaloneQuestions: nextStandalone });
    toast.success("Question added to interview");

    if (userId && userId !== "guest") {
      const updatedIv = nextInterviews.find((i) => i.id === interviewId);
      if (updatedIv) {
        void supabase
          .from("interviews" as never)
          .upsert(mapInterviewToRow(userId, updatedIv) as never)
          .then(() => {}, () => {});
      }

      void supabase
        .from("questions" as never)
        .upsert(mapQuestionToRow(userId, newQ) as never)
        .then(() => {}, () => {});
    }
  },

  addStandaloneQuestion: (qData) => {
    const userId = get().userId;
    const id = `q-${nanoid(8)}`;
    const newQ: QuestionItem = {
      ...qData,
      id,
      dateAdded: new Date().toISOString().slice(0, 10),
    };

    let nextInterviews = get().interviews;
    const affectedIvIds: string[] = [];
    if (newQ.company || newQ.interviewId) {
      nextInterviews = nextInterviews.map((iv) => {
        const matchById = newQ.interviewId && iv.id === newQ.interviewId;
        const matchByComp =
          newQ.company &&
          iv.company.trim().toLowerCase() === newQ.company.trim().toLowerCase();
        if (matchById || matchByComp) {
          if (!iv.questions.some((q) => q.id === newQ.id)) {
            affectedIvIds.push(iv.id);
            return { ...iv, questions: [newQ, ...iv.questions], updatedAt: now() };
          }
        }
        return iv;
      });
    }

    const nextQ = [newQ, ...get().standaloneQuestions];
    persistStore(userId, nextInterviews, nextQ);
    set({ interviews: nextInterviews, standaloneQuestions: nextQ });
    toast.success("Question added to bank");

    if (userId && userId !== "guest") {
      void supabase
        .from("questions" as never)
        .upsert(mapQuestionToRow(userId, newQ) as never)
        .then(() => {}, () => {});

      for (const ivId of affectedIvIds) {
        const updatedIv = nextInterviews.find((iv) => iv.id === ivId);
        if (updatedIv) {
          void supabase
            .from("interviews" as never)
            .upsert(mapInterviewToRow(userId, updatedIv) as never)
            .then(() => {}, () => {});
        }
      }
    }
    return newQ;
  },

  updateQuestion: (id, patch) => {
    const userId = get().userId;
    let targetQuestion: QuestionItem | null = null;
    const affectedIvIds: string[] = [];

    // 1. Update in interviews list if present
    const nextIv = get().interviews.map((iv) => {
      const qIndex = iv.questions.findIndex((q) => q.id === id);
      if (qIndex >= 0) {
        affectedIvIds.push(iv.id);
        const updatedQs = [...iv.questions];
        updatedQs[qIndex] = { ...updatedQs[qIndex], ...patch };
        targetQuestion = updatedQs[qIndex];
        return { ...iv, questions: updatedQs, updatedAt: now() };
      }
      return iv;
    });

    // 2. Update in standalone questions list
    const nextQ = get().standaloneQuestions.map((q) => {
      if (q.id === id) {
        const updated = { ...q, ...patch };
        if (!targetQuestion) targetQuestion = updated;
        return updated;
      }
      return q;
    });

    persistStore(userId, nextIv, nextQ);
    set({ interviews: nextIv, standaloneQuestions: nextQ });
    toast.success("Question updated");

    // 3. Sync DB if authenticated
    if (userId && userId !== "guest") {
      if (targetQuestion) {
        void supabase
          .from("questions" as never)
          .upsert(mapQuestionToRow(userId, targetQuestion) as never)
          .then(() => {}, (err) => console.error("Error updating question in DB:", err));
      }

      for (const ivId of affectedIvIds) {
        const updatedIv = nextIv.find((iv) => iv.id === ivId);
        if (updatedIv) {
          void supabase
            .from("interviews" as never)
            .upsert(mapInterviewToRow(userId, updatedIv) as never)
            .then(() => {}, (err) => console.error("Error updating interview questions in DB:", err));
        }
      }
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
      updatedAt: iv.questions.some((q) => q.id === id) ? now() : iv.updatedAt,
    }));

    const nextQ = get().standaloneQuestions.filter((q) => q.id !== id);

    persistStore(userId, nextIv, nextQ);
    set({ interviews: nextIv, standaloneQuestions: nextQ });
    toast.success("Question removed");

    if (userId && userId !== "guest") {
      void supabase
        .from("questions" as never)
        .delete()
        .eq("id", id)
        .then(() => {}, () => {});

      if (targetIv) {
        const updatedIv = nextIv.find((iv) => iv.id === targetIv.id);
        if (updatedIv) {
          void supabase
            .from("interviews" as never)
            .upsert(mapInterviewToRow(userId, updatedIv) as never)
            .then(() => {}, () => {});
        }
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
