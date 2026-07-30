import { useState } from "react";
import { Briefcase, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function LoginScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e?: React.SyntheticEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (busy) return;

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") {
        const res = await signIn(email, password);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        toast.success("Welcome back");
      } else {
        const res = await signUp(email, password, name);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        if (res.needsConfirmation) {
          toast.success("Check your inbox to confirm your email, then sign in.");
          setMode("signin");
        } else {
          toast.success("Account created");
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "An unexpected error occurred.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Briefcase className="h-5 w-5" />
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">JobTrack</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your job applications, securely in the cloud</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{mode === "signin" ? "Sign in" : "Create account"}</CardTitle>
            <CardDescription>Your applications are private to your account.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mode Switcher */}
            <div className="grid w-full grid-cols-2 rounded-lg bg-muted p-1 text-muted-foreground mb-4">
              <button
                type="button"
                onClick={() => { setMode("signin"); setError(null); }}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                  mode === "signin" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 hover:text-foreground"
                )}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setError(null); }}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                  mode === "signup" ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50 hover:text-foreground"
                )}
              >
                Sign up
              </button>
            </div>

            <div className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aniket"
                    onKeyDown={(e) => { if (e.key === "Enter") void submit(e); }}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email" type="email" autoComplete="username" required
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  onKeyDown={(e) => { if (e.key === "Enter") void submit(e); }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password" type="password" required minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  onKeyDown={(e) => { if (e.key === "Enter") void submit(e); }}
                />
              </div>

              {error && <p className="text-sm text-destructive font-medium">{error}</p>}

              <Button
                type="button"
                onClick={(e) => void submit(e)}
                className="w-full"
                disabled={busy}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

