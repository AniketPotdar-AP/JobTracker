import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type SessionUser = { id: string; email: string; name: string };

type AuthState = {
  user: SessionUser | null;
  hydrated: boolean;
  setSession: (session: Session | null) => void;
  setHydrated: (v: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ ok: true; needsConfirmation: boolean } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
};

function toUser(session: Session | null): SessionUser | null {
  if (!session?.user) return null;
  const meta = session.user.user_metadata ?? {};
  const email = session.user.email ?? "";
  return {
    id: session.user.id,
    email,
    name: (meta.full_name as string) || (meta.name as string) || email.split("@")[0] || "User",
  };
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  hydrated: false,
  setSession: (session) => set({ user: toUser(session) }),
  setHydrated: (v) => set({ hydrated: v }),

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  },

  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: { full_name: name.trim() || email.split("@")[0] },
      },
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, needsConfirmation: !data.session };
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
