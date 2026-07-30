import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Toaster } from "@/components/ui/sonner";
import { useApplicationsStore } from "@/store/useApplications";
import { useAuthStore } from "@/store/useAuth";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { purgeLegacyData } from "@/lib/local-store";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong on our end.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >Try again</button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >Go home</Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function AppShell() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const loadedUserId = useRef<string | null>(null);

  // Boot: restore theme, subscribe to the cloud session.
  useEffect(() => {
    purgeLegacyData();
    useApplicationsStore.getState().hydrateTheme();

    const { setSession, setHydrated } = useAuthStore.getState();
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data?.session ?? null);
        setHydrated(true);
      })
      .catch(() => {
        if (!mounted) return;
        setHydrated(true);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setHydrated(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load / unload the signed-in user's cloud data — only when userId genuinely changes.
  useEffect(() => {
    if (userId) {
      if (loadedUserId.current === userId) return; // already loaded for this user
      loadedUserId.current = userId;
      void useApplicationsStore.getState().loadUser(userId);
    } else {
      loadedUserId.current = null;
      useApplicationsStore.getState().unloadUser();
    }
  }, [userId]);


  if (!user) {
    return (
      <>
        <LoginScreen />
        <Toaster />
      </>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* On mobile: pad bottom enough for nav bar + safe area */}
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 pb-nav-safe md:pb-8">
          <Outlet />
        </div>
      </main>
      <MobileNav />
      <Toaster />
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
