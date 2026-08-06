import { create } from "zustand";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { readLocal, writeLocal } from "@/lib/local-store";
import type { InterviewRecord, QuestionItem } from "@/types/interviews";
import { INTERVIEW_STATUSES, STATUS_LABEL } from "@/lib/status";
import type { Application } from "@/store/useApplications";

const now = () => new Date().toISOString();

const SEED_INTERVIEWS: InterviewRecord[] = [];

const SEED_STANDALONE_QUESTIONS: QuestionItem[] = [];

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
    const ivKey = `jat.interviews.${userId}`;
    const qKey = `jat.questions.${userId}`;
    const cachedIv = readLocal<InterviewRecord[]>(ivKey);
    const cachedQ = readLocal<QuestionItem[]>(qKey);

    set({
      userId,
      interviews: cachedIv && Array.isArray(cachedIv) ? cachedIv : SEED_INTERVIEWS,
      standaloneQuestions:
        cachedQ && Array.isArray(cachedQ) ? cachedQ : SEED_STANDALONE_QUESTIONS,
    });
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
      const historyEntries = (app.statusHistory || []).filter((h) =>
        INTERVIEW_STATUSES.includes(h.status) && h.status !== "recruiter_call",
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
      const userId = get().userId;
      if (userId) writeLocal(`jat.interviews.${userId}`, currentInterviews);
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
    const userId = get().userId;
    if (userId) writeLocal(`jat.interviews.${userId}`, next);
    set({ interviews: next });
    toast.success("Interview logged successfully");
    return iv;
  },

  updateInterview: (id, patch) => {
    const next = get().interviews.map((iv) =>
      iv.id === id ? { ...iv, ...patch, updatedAt: now() } : iv,
    );
    const userId = get().userId;
    if (userId) writeLocal(`jat.interviews.${userId}`, next);
    set({ interviews: next });
    toast.success("Interview updated");
  },

  deleteInterview: (id) => {
    const next = get().interviews.filter((iv) => iv.id !== id);
    const userId = get().userId;
    if (userId) writeLocal(`jat.interviews.${userId}`, next);
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

    const userId = get().userId;
    if (userId) writeLocal(`jat.interviews.${userId}`, nextInterviews);
    set({ interviews: nextInterviews });
    toast.success("Question added to interview");
  },

  addStandaloneQuestion: (qData) => {
    const id = `q-${nanoid(8)}`;
    const newQ: QuestionItem = {
      ...qData,
      id,
      dateAdded: new Date().toISOString().slice(0, 10),
    };
    const next = [newQ, ...get().standaloneQuestions];
    const userId = get().userId;
    if (userId) writeLocal(`jat.questions.${userId}`, next);
    set({ standaloneQuestions: next });
    toast.success("Question added to bank");
    return newQ;
  },

  updateQuestion: (id, patch) => {
    // Check inside interviews
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
      const userId = get().userId;
      if (userId) writeLocal(`jat.interviews.${userId}`, nextIv);
      set({ interviews: nextIv });
      toast.success("Question updated");
      return;
    }

    // Otherwise check standalone questions
    const nextQ = get().standaloneQuestions.map((q) =>
      q.id === id ? { ...q, ...patch } : q,
    );
    const userId = get().userId;
    if (userId) writeLocal(`jat.questions.${userId}`, nextQ);
    set({ standaloneQuestions: nextQ });
    toast.success("Question updated");
  },

  deleteQuestion: (id) => {
    // Delete from interviews if present
    const nextIv = get().interviews.map((iv) => ({
      ...iv,
      questions: iv.questions.filter((q) => q.id !== id),
    }));

    // Delete from standalone questions if present
    const nextQ = get().standaloneQuestions.filter((q) => q.id !== id);

    const userId = get().userId;
    if (userId) {
      writeLocal(`jat.interviews.${userId}`, nextIv);
      writeLocal(`jat.questions.${userId}`, nextQ);
    }
    set({ interviews: nextIv, standaloneQuestions: nextQ });
    toast.success("Question removed");
  },

  getAllQuestions: () => {
    const ivQuestions = get()
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
    return [...ivQuestions, ...get().standaloneQuestions];
  },
}));
