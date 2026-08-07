import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Download,
  Upload,
  Moon,
  Sun,
  FileSpreadsheet,
  LogOut,
  Briefcase,
  Video,
  HelpCircle,
  Database,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useApplicationsStore, type Application } from "@/store/useApplications";
import { useInterviewsStore } from "@/store/useInterviews";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuth";
import {
  exportApplicationsToXlsx,
  exportInterviewsToXlsx,
  exportQuestionsToXlsx,
  exportFullBackupToXlsx,
} from "@/lib/xlsx-export";
import { processSmartJsonImport } from "@/lib/data-importer";
import type { InterviewRecord, QuestionItem } from "@/types/interviews";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — JobTrack" },
      {
        name: "description",
        content: "Manage preferences, data import and export for applications, interviews, and questions.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const apps = useApplicationsStore((s) => s.applications);
  const importAppsData = useApplicationsStore((s) => s.importData);
  const clearApps = useApplicationsStore((s) => s.clearAll);
  const theme = useApplicationsStore((s) => s.theme);
  const setTheme = useApplicationsStore((s) => s.setTheme);

  const interviews = useInterviewsStore((s) => s.interviews);
  const importInterviews = useInterviewsStore((s) => s.importInterviews);
  const clearInterviews = useInterviewsStore((s) => s.clearAll);
  const getAllQuestions = useInterviewsStore((s) => s.getAllQuestions);
  const importQuestions = useInterviewsStore((s) => s.importQuestions);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.signOut);
  const [confirmClear, setConfirmClear] = useState(false);

  const universalFileRef = useRef<HTMLInputElement>(null);
  const appsFileRef = useRef<HTMLInputElement>(null);
  const interviewsFileRef = useRef<HTMLInputElement>(null);
  const questionsFileRef = useRef<HTMLInputElement>(null);

  const questionsList = getAllQuestions();

  const handleSmartImport = async (file: File) => {
    try {
      const text = await file.text();
      const stats = await processSmartJsonImport(text, {
        importApplications: async (data) => importAppsData(data),
        importInterviews: async (data) => importInterviews(data),
        importQuestions: async (data) => importQuestions(data),
      });

      const parts: string[] = [];
      if (stats.applications > 0) parts.push(`${stats.applications} applications`);
      if (stats.interviews > 0) parts.push(`${stats.interviews} interviews`);
      if (stats.questions > 0) parts.push(`${stats.questions} questions`);

      if (parts.length > 0) {
        toast.success(`Successfully imported: ${parts.join(", ")}`);
      } else {
        toast.info("No new records were imported.");
      }
    } catch {
      toast.error("Could not import file — please check that it is a valid JSON export.");
    }
  };

  const handleSectionImport = async (file: File, section: "apps" | "interviews" | "questions") => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        // Fallback to smart import if structured JSON object is provided
        await handleSmartImport(file);
        return;
      }

      if (section === "apps") {
        await importAppsData(parsed as Application[]);
        toast.success(`Imported ${parsed.length} applications`);
      } else if (section === "interviews") {
        await importInterviews(parsed as InterviewRecord[]);
        toast.success(`Imported ${parsed.length} interview records`);
      } else if (section === "questions") {
        await importQuestions(parsed as QuestionItem[]);
        toast.success(`Imported ${parsed.length} questions`);
      }
    } catch {
      toast.error(`Could not import ${section} file — invalid JSON format.`);
    }
  };

  // Export functions
  const exportFullBackupJson = () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      applications: apps,
      interviews: interviews,
      questions: questionsList,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jobtrack-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Full backup JSON exported");
  };

  const exportAppsJson = () => {
    const blob = new Blob([JSON.stringify(apps, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jobtrack-applications-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Applications JSON exported");
  };

  const exportInterviewsJson = () => {
    const blob = new Blob([JSON.stringify(interviews, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jobtrack-interviews-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Interviews JSON exported");
  };

  const exportQuestionsJson = () => {
    const blob = new Blob([JSON.stringify(questionsList, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jobtrack-questions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Questions JSON exported");
  };

  return (
    <>
      <PageHeader
        title="Settings & Data Management"
        description="Configure preferences, view summary counts, and export/import data for all sections."
      />

      {/* Hidden file inputs */}
      <input
        ref={universalFileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleSmartImport(f);
          e.target.value = "";
        }}
      />
      <input
        ref={appsFileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleSectionImport(f, "apps");
          e.target.value = "";
        }}
      />
      <input
        ref={interviewsFileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleSectionImport(f, "interviews");
          e.target.value = "";
        }}
      />
      <input
        ref={questionsFileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleSectionImport(f, "questions");
          e.target.value = "";
        }}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="font-semibold">{user?.name || "User Account"}</div>
              <div className="text-xs text-muted-foreground">{user?.email || "Local Guest Mode"}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sun className="h-4 w-4 text-primary" /> Appearance & Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Choose your preferred interface color mode.
            </p>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => setTheme("light")}
                size="sm"
              >
                <Sun className="h-4 w-4" /> Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                onClick={() => setTheme("dark")}
                size="sm"
              >
                <Moon className="h-4 w-4" /> Dark
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Backup & Restore */}
      <Card className="mt-6 border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" /> Full Data Backup & Restore
            </CardTitle>
            <Badge variant="secondary" className="text-xs font-semibold">
              All Sections
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Backup or restore your entire account data across Applications, Interview rounds, and Questions Bank in a single file.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 pt-1">
          <Button variant="default" size="sm" onClick={exportFullBackupJson} className="gap-1.5">
            <Download className="h-4 w-4" /> Export Complete Backup (JSON)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void exportFullBackupToXlsx(apps, interviews, questionsList, user?.email ?? "jobtrack")}
            className="gap-1.5"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export All Sheets (.xlsx)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => universalFileRef.current?.click()}
            className="gap-1.5 border-primary/30"
          >
            <Upload className="h-4 w-4" /> Import Backup (Auto-Detect JSON)
          </Button>
        </CardContent>
      </Card>

      {/* Section-Specific Import / Export Grid */}
      <div className="mt-6 space-y-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          Section-Specific Import & Export
        </h3>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Applications Card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-500" /> Applications
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {apps.length} saved
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Import or export job application tracker records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              <div className="flex flex-col gap-1.5">
                <Button variant="outline" size="sm" onClick={exportAppsJson} className="justify-start text-xs h-8">
                  <Download className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /> Export JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void exportApplicationsToXlsx(apps, user?.email ?? "jobtrack")}
                  className="justify-start text-xs h-8"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> Export Excel (.xlsx)
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => appsFileRef.current?.click()}
                  className="justify-start text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Import Applications JSON
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Interviews Card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Video className="h-4 w-4 text-purple-500" /> Interview Rounds
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {interviews.length} logged
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Import or export logged interview rounds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              <div className="flex flex-col gap-1.5">
                <Button variant="outline" size="sm" onClick={exportInterviewsJson} className="justify-start text-xs h-8">
                  <Download className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /> Export JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void exportInterviewsToXlsx(interviews, user?.email ?? "jobtrack")}
                  className="justify-start text-xs h-8"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> Export Excel (.xlsx)
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => interviewsFileRef.current?.click()}
                  className="justify-start text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Import Interviews JSON
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Questions Bank Card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-emerald-500" /> Question Bank
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {questionsList.length} questions
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Import or export technical interview questions & answers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              <div className="flex flex-col gap-1.5">
                <Button variant="outline" size="sm" onClick={exportQuestionsJson} className="justify-start text-xs h-8">
                  <Download className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /> Export JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void exportQuestionsToXlsx(questionsList, user?.email ?? "jobtrack")}
                  className="justify-start text-xs h-8"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> Export Excel (.xlsx)
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => questionsFileRef.current?.click()}
                  className="justify-start text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Import Questions JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Danger Zone */}
      <Card className="mt-6 border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" /> Danger Zone
          </CardTitle>
          <CardDescription className="text-xs">
            Wipe all saved applications, logged interview rounds, and questions bank from local storage and database.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmClear(true)}
            className="gap-1.5"
          >
            <Trash2 className="h-4 w-4" /> Clear All Account Data
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Alert Dialog */}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {apps.length} applications, {interviews.length} interview records, and {questionsList.length} questions from your browser and database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                void clearApps();
                clearInterviews();
                toast.success("All data cleared successfully");
                setConfirmClear(false);
              }}
            >
              Clear Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
