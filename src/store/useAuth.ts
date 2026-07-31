import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type SessionUser = { id: string; email: string; name: string };

type AuthState = {
  user: SessionUser | null;
  hydrated: boolean;
  setSession: (session: Session | null) => void;
  setHydrated: (v: boolean) => void;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<
    { ok: true; needsConfirmation: boolean } | { ok: false; error: string }
  >;
  signOut: () => Promise<void>;
};

function toUser(session: Session | null): SessionUser | null {
  if (!session?.user) return null;
  const meta = session.user.user_metadata ?? {};
  const email = session.user.email ?? "";
  return {
    id: session.user.id,
    email,
    name:
      (meta.full_name as string) ||
      (meta.name as string) ||
      email.split("@")[0] ||
      "User",
  };
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  hydrated: false,
  setSession: (session) => {
    const newUser = toUser(session);
    // Only update state if the user ID actually changed — prevents infinite re-render
    // loops from onAuthStateChange firing on tab focus / token refresh.
    set((prev) => {
      if (prev.user?.id === newUser?.id) return prev;
      return { user: newUser };
    });
  },
  setHydrated: (v) => set({ hydrated: v }),

  signIn: async (email, password) => {
    try {
      const timeoutPromise = new Promise<{ error: { message: string } }>(
        (_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Sign in timed out. Please check your network and try again.",
                ),
              ),
            8000,
          ),
      );
      const res = await Promise.race([
        supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        }),
        timeoutPromise,
      ]);
      if (res.error) return { ok: false as const, error: res.error.message };
      return { ok: true as const };
    } catch (e: any) {
      return {
        ok: false as const,
        error: e?.message ?? "Network error during sign in.",
      };
    }
  },

  signUp: async (email, password, name) => {
    try {
      const timeoutPromise = new Promise<{
        data: any;
        error: { message: string };
      }>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "Sign up timed out. Please check your network and try again.",
              ),
            ),
          8000,
        ),
      );
      const res = await Promise.race([
        supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo:
              typeof window !== "undefined"
                ? window.location.origin
                : undefined,
            data: { full_name: name.trim() || email.split("@")[0] },
          },
        }),
        timeoutPromise,
      ]);
      if (res.error) return { ok: false as const, error: res.error.message };
      return { ok: true as const, needsConfirmation: !res.data?.session };
    } catch (e: any) {
      return {
        ok: false as const,
        error: e?.message ?? "Network error during sign up.",
      };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    if (typeof localStorage !== "undefined") {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("jat.apps.") || k.startsWith("sb-")) {
          try {
            localStorage.removeItem(k);
          } catch {
            /* ignore */
          }
        }
      });
    }
    set({ user: null });
  },
}));
