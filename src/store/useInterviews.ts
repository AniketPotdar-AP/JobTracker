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

const getInitialDeletedInterviews = (): string[] => {
  if (typeof window === "undefined") return [];
  const data = readLocal<string[]>("jat.deleted_interviews");
  if (data && Array.isArray(data)) return data;
  return [];
};

// Helper to reliably save interviews & standalone questions to localStorage
const persistStore = (
  userId: string | null,
  interviews: InterviewRecord[],
  standaloneQuestions: QuestionItem[],
  deletedIds?: string[],
) => {
  const keyUser = userId || "guest";
  writeLocal(`jat.interviews.${keyUser}`, interviews);
  writeLocal(`jat.questions.${keyUser}`, standaloneQuestions);
  if (deletedIds) {
    writeLocal("jat.deleted_interviews", deletedIds);
  }

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
  deletedInterviewIds: string[];
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
  reorderInterviewQuestions: (
    interviewId: string,
    startIndex: number,
    endIndex: number,
  ) => void;

  addStandaloneQuestion: (
    question: Omit<QuestionItem, "id" | "dateAdded">,
  ) => QuestionItem;
  updateQuestion: (id: string, patch: Partial<QuestionItem>) => void;
  deleteQuestion: (id: string, interviewId?: string) => void;

  getAllQuestions: () => QuestionItem[];
  importInterviews: (data: InterviewRecord[]) => Promise<void>;
  importQuestions: (data: QuestionItem[]) => Promise<void>;
  clearAll: () => void;
};

export function isRoundTypeMatch(a?: string, b?: string): boolean {
  if (!a || !b) return true;
  const normA = a.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const normB = b.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;
  return false;
}

export function filterQuestionsForInterview(
  questions: QuestionItem[],
  iv: InterviewRecord,
  allInterviews: InterviewRecord[] = [],
): QuestionItem[] {
  if (!questions || !Array.isArray(questions)) return [];

  const normIvCompany = (iv.company || "").trim().toLowerCase();
  const normIvRound = (iv.roundType || "").trim().toLowerCase();
  const knownIvIds = new Set(allInterviews.map((i) => i.id));

  return questions.filter((q) => {
    if (!q) return false;

    if (q.company) {
      const normQCompany = q.company.trim().toLowerCase();
      if (normQCompany !== normIvCompany) return false;
    }

    if (q.interviewId && (q.interviewId === iv.id || knownIvIds.has(q.interviewId))) {
      return q.interviewId === iv.id;
    }

    if (q.roundType && iv.roundType) {
      return isRoundTypeMatch(q.roundType, normIvRound);
    }

    return true;
  });
}

export function getInterviewQuestions(
  interview: InterviewRecord,
  standaloneQuestions: QuestionItem[] = [],
): QuestionItem[] {
  if (!interview) return [];
  const direct = filterQuestionsForInterview(interview.questions || [], interview);
  const directIds = new Set(direct.map((q) => q.id));
  const directTexts = new Set(direct.map((q) => q.question.trim().toLowerCase()));

  const normIvCompany = (interview.company || "").trim().toLowerCase();
  const normIvRound = (interview.roundType || "").trim().toLowerCase();

  const matchingStandalone = (standaloneQuestions || []).filter((q) => {
    if (!q) return false;
    if (q.interviewId) {
      return q.interviewId === interview.id;
    }
    if (q.company && q.roundType) {
      return (
        q.company.trim().toLowerCase() === normIvCompany &&
        isRoundTypeMatch(q.roundType, normIvRound)
      );
    }
    return false;
  });

  const result = [...direct];
  for (const sq of matchingStandalone) {
    if (
      !directIds.has(sq.id) &&
      !directTexts.has(sq.question.trim().toLowerCase())
    ) {
      result.push(sq);
    }
  }
  return result;
}

export function dedupeInterviews(records: InterviewRecord[]): InterviewRecord[] {
  const result: InterviewRecord[] = [];
  const seenIds = new Set<string>();

  for (const rawIv of records) {
    if (!rawIv || !rawIv.id) continue;
    if (seenIds.has(rawIv.id)) continue;

    const cleanQuestions = filterQuestionsForInterview(rawIv.questions || [], rawIv);
    let cleanLocation = rawIv.locationOrUrl;
    if (
      cleanLocation &&
      (cleanLocation.includes("\n") ||
        cleanLocation.length > 200 ||
        (rawIv.notes && cleanLocation === rawIv.notes))
    ) {
      cleanLocation = undefined;
    }
    const iv = { ...rawIv, locationOrUrl: cleanLocation, questions: cleanQuestions };

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

      if (rAppId && appId && rAppId === appId && rRound && normRound && isRoundTypeMatch(rRound, normRound)) {
        return true;
      }

      if (rCompany && normCompany && rCompany === normCompany && rRound && normRound && isRoundTypeMatch(rRound, normRound) && rDate && normDate && rDate === normDate) {
        return true;
      }

      return false;
    });

    if (existingIndex >= 0) {
      const existing = result[existingIndex];
      const mergedQuestions = filterQuestionsForInterview(
        [...(existing.questions || []), ...(iv.questions || [])],
        existing,
      );
      const uniqueQMap = new Map<string, QuestionItem>();
      for (const q of mergedQuestions) {
        if (!uniqueQMap.has(q.id)) uniqueQMap.set(q.id, q);
      }
      let finalLocation = existing.locationOrUrl || iv.locationOrUrl;
      if (
        finalLocation &&
        (finalLocation.includes("\n") ||
          finalLocation.length > 200 ||
          (existing.notes && finalLocation === existing.notes))
      ) {
        finalLocation = undefined;
      }

      const combinedAliasIds = Array.from(
        new Set([
          ...(existing.aliasIds || [existing.id]),
          ...(iv.aliasIds || [iv.id]),
          existing.id,
          iv.id,
        ]),
      );

      result[existingIndex] = {
        ...existing,
        aliasIds: combinedAliasIds,
        applicationId: existing.applicationId || iv.applicationId,
        jobTitle: existing.jobTitle || iv.jobTitle,
        interviewerName: existing.interviewerName || iv.interviewerName,
        locationOrUrl: finalLocation,
        notes: existing.notes || iv.notes,
        outcome: existing.outcome || iv.outcome,
        questions: Array.from(uniqueQMap.values()),
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
  deletedInterviewIds: getInitialDeletedInterviews(),
  userId: null,

  loadUser: (userId) => {
    const keyUser = userId || "guest";
    const ivKey = `jat.interviews.${keyUser}`;
    const qKey = `jat.questions.${keyUser}`;
    const cachedIv = readLocal<InterviewRecord[]>(ivKey);
    const cachedQ = readLocal<QuestionItem[]>(qKey);

    const initialDeduped =
      cachedIv && Array.isArray(cachedIv) && cachedIv.length > 0
        ? dedupeInterviews(cachedIv)
        : getInitialInterviews();

    const initialQuestions =
      cachedQ && Array.isArray(cachedQ) && cachedQ.length > 0
        ? cachedQ
        : getInitialQuestions();

    set({
      userId: keyUser,
      interviews: initialDeduped,
      standaloneQuestions: initialQuestions,
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

          if (!ivRes.error && ivRes.data) {
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

            const mergedIv = dedupeInterviews([...get().interviews, ...rawDbIv]);
            set({ interviews: mergedIv });
            persistStore(userId, mergedIv, get().standaloneQuestions, get().deletedInterviewIds);
          }

          if (!qRes.error && qRes.data) {
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
                    (!q.interviewId &&
                      q.company &&
                      q.company.trim().toLowerCase() === iv.company.trim().toLowerCase() &&
                      q.roundType &&
                      isRoundTypeMatch(q.roundType, iv.roundType)),
                );
                if (matchingQ.length === 0) return iv;
                const filteredMatching = filterQuestionsForInterview(matchingQ, iv);
                const existingIds = new Set(iv.questions.map((q) => q.id));
                const newQuestions = [...iv.questions];
                for (const mq of filteredMatching) {
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
          /* Gracefully ignore */
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
    const newOrUpdatedIv: InterviewRecord[] = [];
    const deletedSet = new Set(get().deletedInterviewIds || []);

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
        const cleanRoundKey = normRound.replace(/[^a-z0-9]/g, "");
        const cleanAppId = (app.id || "").replace(/[^a-z0-9_-]/gi, "");
        const deterministicId = `iv-app_${cleanAppId}_${cleanRoundKey}`;

        // Do not resurrect deleted interviews!
        if (deletedSet.has(deterministicId)) continue;

        const existing = currentInterviews.find(
          (iv) =>
            iv.id === deterministicId ||
            (iv.applicationId && iv.applicationId === app.id && isRoundTypeMatch(iv.roundType, normRound)) ||
            ((iv.company || "").trim().toLowerCase() === normCompany && isRoundTypeMatch(iv.roundType, normRound)),
        );

        if (existing && deletedSet.has(existing.id)) continue;

        if (!existing) {
          const newIv: InterviewRecord = {
            id: deterministicId,
            applicationId: app.id,
            company: app.company,
            jobTitle: app.title,
            roundType: roundLabel,
            interviewDate: dateVal.slice(0, 10),
            interviewerName: app.recruiterName,
            locationOrUrl: undefined,
            outcome:
              app.status === "rejected"
                ? "failed"
                : app.status === "offer" || app.status === "joined"
                  ? "passed"
                  : "completed",
            notes: undefined,
            questions: [],
            createdAt: now(),
            updatedAt: now(),
          };
          currentInterviews.push(newIv);
          newOrUpdatedIv.push(newIv);
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
            const updatedIv = { ...existing, ...patch, updatedAt: now() };
            currentInterviews = currentInterviews.map((iv) =>
              iv.id === existing.id ? updatedIv : iv,
            );
            newOrUpdatedIv.push(updatedIv);
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
      persistStore(get().userId, currentInterviews, get().standaloneQuestions, get().deletedInterviewIds);
      set({ interviews: currentInterviews });

      const userId = get().userId;
      if (userId && userId !== "guest" && newOrUpdatedIv.length > 0) {
        for (const iv of newOrUpdatedIv) {
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
    const questionsWithIvId: QuestionItem[] = (data.questions || []).map((q, idx) => ({
      ...q,
      id: q.id && !q.id.startsWith("draft-") ? q.id : `q-${nanoid(8)}`,
      interviewId: id,
      company: q.company || data.company,
      jobTitle: q.jobTitle || data.jobTitle,
      roundType: q.roundType || data.roundType,
      dateAdded: q.dateAdded || data.interviewDate || new Date().toISOString().slice(0, 10),
    }));
    const iv: InterviewRecord = {
      ...data,
      id,
      questions: questionsWithIvId,
      createdAt: now(),
      updatedAt: now(),
    };
    const next = dedupeInterviews([iv, ...get().interviews]);
    persistStore(userId, next, get().standaloneQuestions);
    set({ interviews: next });
    toast.success("Interview logged successfully");

    if (userId && userId !== "guest") {
      void supabase
        .from("interviews" as never)
        .upsert(mapInterviewToRow(userId, iv) as never)
        .then(() => {}, (err) => console.error("Error creating interview in DB:", err));

      for (const q of questionsWithIvId) {
        void supabase
          .from("questions" as never)
          .upsert(mapQuestionToRow(userId, q) as never)
          .then(() => {}, () => {});
      }
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
    const nextDeletedIds = Array.from(new Set([...(get().deletedInterviewIds || []), id]));

    persistStore(userId, next, get().standaloneQuestions, nextDeletedIds);
    set({ interviews: next, deletedInterviewIds: nextDeletedIds });
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

  reorderInterviewQuestions: (interviewId, startIndex, endIndex) => {
    const userId = get().userId;
    const targetIv = get().interviews.find((i) => i.id === interviewId);
    if (!targetIv) return;

    const currentQuestions = getInterviewQuestions(targetIv, get().standaloneQuestions);
    if (
      startIndex < 0 ||
      startIndex >= currentQuestions.length ||
      endIndex < 0 ||
      endIndex >= currentQuestions.length ||
      startIndex === endIndex
    ) {
      return;
    }

    const updatedQuestions = [...currentQuestions];
    const [moved] = updatedQuestions.splice(startIndex, 1);
    updatedQuestions.splice(endIndex, 0, moved);

    const nextInterviews = get().interviews.map((iv) =>
      iv.id === interviewId
        ? { ...iv, questions: updatedQuestions, updatedAt: now() }
        : iv,
    );

    persistStore(userId, nextInterviews, get().standaloneQuestions);
    set({ interviews: nextInterviews });

    if (userId && userId !== "guest") {
      const updatedIv = nextInterviews.find((i) => i.id === interviewId);
      if (updatedIv) {
        void supabase
          .from("interviews" as never)
          .upsert(mapInterviewToRow(userId, updatedIv) as never)
          .then(() => {}, () => {});
      }
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
        const matchByCompAndRound =
          !newQ.interviewId &&
          newQ.company &&
          newQ.roundType &&
          iv.company.trim().toLowerCase() === newQ.company.trim().toLowerCase() &&
          iv.roundType.trim().toLowerCase() === newQ.roundType.trim().toLowerCase();
        if (matchById || matchByCompAndRound) {
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
    let oldQuestionText = "";

    for (const iv of get().interviews) {
      const q = iv.questions.find((item) => item.id === id);
      if (q) {
        oldQuestionText = q.question.trim().toLowerCase();
        break;
      }
    }
    if (!oldQuestionText) {
      const sq = get().standaloneQuestions.find((item) => item.id === id);
      if (sq) oldQuestionText = sq.question.trim().toLowerCase();
    }

    const affectedIvIds: string[] = [];

    const nextIv = get().interviews.map((iv) => {
      let updated = false;
      const updatedQs = iv.questions.map((q) => {
        const isMatch =
          q.id === id || (oldQuestionText && q.question.trim().toLowerCase() === oldQuestionText);
        if (isMatch) {
          updated = true;
          const patched = { ...q, ...patch };
          if (!targetQuestion) targetQuestion = patched;
          return patched;
        }
        return q;
      });

      if (updated) {
        affectedIvIds.push(iv.id);
        return { ...iv, questions: updatedQs, updatedAt: now() };
      }
      return iv;
    });

    const nextQ = get().standaloneQuestions.map((q) => {
      const isMatch =
        q.id === id || (oldQuestionText && q.question.trim().toLowerCase() === oldQuestionText);
      if (isMatch) {
        const updated = { ...q, ...patch };
        if (!targetQuestion) targetQuestion = updated;
        return updated;
      }
      return q;
    });

    persistStore(userId, nextIv, nextQ, get().deletedInterviewIds);
    set({ interviews: nextIv, standaloneQuestions: nextQ });
    toast.success("Question updated");

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

  deleteQuestion: (id, targetInterviewId) => {
    const userId = get().userId;
    let questionTextToDelete = "";

    for (const iv of get().interviews) {
      const q = iv.questions.find((item) => item.id === id);
      if (q) {
        questionTextToDelete = q.question.trim().toLowerCase();
        break;
      }
    }
    if (!questionTextToDelete) {
      const sq = get().standaloneQuestions.find((item) => item.id === id);
      if (sq) questionTextToDelete = sq.question.trim().toLowerCase();
    }

    const affectedIvIds: string[] = [];

    const nextIv = get().interviews.map((iv) => {
      const shouldFilter = targetInterviewId ? iv.id === targetInterviewId : true;
      if (!shouldFilter) return iv;

      let changed = false;
      const filteredQuestions = iv.questions.filter((q) => {
        if (q.id === id) {
          changed = true;
          return false;
        }
        if (questionTextToDelete && q.question.trim().toLowerCase() === questionTextToDelete) {
          changed = true;
          return false;
        }
        return true;
      });

      if (changed) {
        affectedIvIds.push(iv.id);
        return {
          ...iv,
          questions: filteredQuestions,
          updatedAt: now(),
        };
      }
      return iv;
    });

    const nextQ = get().standaloneQuestions.filter((q) => {
      if (q.id === id) return false;
      if (questionTextToDelete && q.question.trim().toLowerCase() === questionTextToDelete) return false;
      return true;
    });

    persistStore(userId, nextIv, nextQ, get().deletedInterviewIds);
    set({ interviews: nextIv, standaloneQuestions: nextQ });
    toast.success("Question removed");

    if (userId && userId !== "guest") {
      void supabase
        .from("questions" as never)
        .delete()
        .eq("id", id)
        .then(() => {}, () => {});

      for (const ivId of affectedIvIds) {
        const updatedIv = nextIv.find((iv) => iv.id === ivId);
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

  importInterviews: async (data: InterviewRecord[]) => {
    const userId = get().userId;
    const deduped = dedupeInterviews([...data, ...get().interviews]);
    persistStore(userId, deduped, get().standaloneQuestions);
    set({ interviews: deduped });
    toast.success(`Imported ${data.length} interview records`);

    if (userId && userId !== "guest") {
      for (const iv of data) {
        void supabase
          .from("interviews" as never)
          .upsert(mapInterviewToRow(userId, iv) as never)
          .then(() => {}, () => {});
      }
    }
  },

  importQuestions: async (data: QuestionItem[]) => {
    const userId = get().userId;
    const currentInterviews = get().interviews;
    const knownIvIds = new Set(currentInterviews.map((i) => i.id));

    // Remap stale interviewId references to matching current interview rounds if needed
    const preparedQuestions = data.map((q) => {
      if (q.interviewId && !knownIvIds.has(q.interviewId) && q.company && q.roundType) {
        const matchingIv = currentInterviews.find(
          (iv) =>
            iv.company.trim().toLowerCase() === q.company!.trim().toLowerCase() &&
            isRoundTypeMatch(iv.roundType, q.roundType),
        );
        if (matchingIv) {
          return { ...q, interviewId: matchingIv.id };
        }
      }
      return q;
    });

    const existingQ = get().standaloneQuestions;
    const existingIds = new Set(existingQ.map((q) => q.id));
    const nextQ = [...existingQ];
    for (const q of preparedQuestions) {
      if (!existingIds.has(q.id)) {
        nextQ.push(q);
      }
    }

    let nextInterviews = get().interviews;
    for (const q of preparedQuestions) {
      if (q.company || q.interviewId) {
        nextInterviews = nextInterviews.map((iv) => {
          const matchById = q.interviewId && iv.id === q.interviewId;
          const matchByComp =
            q.company &&
            q.roundType &&
            iv.company.trim().toLowerCase() === q.company.trim().toLowerCase() &&
            isRoundTypeMatch(q.roundType, q.roundType);
          if (matchById || matchByComp) {
            if (!iv.questions.some((existing) => existing.id === q.id)) {
              return { ...iv, questions: [q, ...iv.questions], updatedAt: now() };
            }
          }
          return iv;
        });
      }
    }

    persistStore(userId, nextInterviews, nextQ);
    set({ interviews: nextInterviews, standaloneQuestions: nextQ });
    toast.success(`Imported ${preparedQuestions.length} questions`);

    if (userId && userId !== "guest") {
      for (const q of preparedQuestions) {
        void supabase
          .from("questions" as never)
          .upsert(mapQuestionToRow(userId, q) as never)
          .then(() => {}, () => {});
      }
    }
  },

  clearAll: () => {
    const userId = get().userId;
    const keyUser = userId || "guest";
    set({ interviews: [], standaloneQuestions: [] });
    persistStore(keyUser, [], []);
    if (userId && userId !== "guest") {
      void supabase.from("interviews" as never).delete().eq("user_id", userId);
      void supabase.from("questions" as never).delete().eq("user_id", userId);
    }
  },
}));
