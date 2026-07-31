import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Download,
  Upload,
  Trash2,
  Moon,
  Sun,
  FileSpreadsheet,
  LogOut,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  useApplicationsStore,
  type Application,
} from "@/store/useApplications";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuth";
import { exportApplicationsToXlsx } from "@/lib/xlsx-export";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings" },
      {
        name: "description",
        content: "Theme, data import and export, and other preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const apps = useApplicationsStore((s) => s.applications);
  const importData = useApplicationsStore((s) => s.importData);
  const clearAll = useApplicationsStore((s) => s.clearAll);
  const theme = useApplicationsStore((s) => s.theme);
  const setTheme = useApplicationsStore((s) => s.setTheme);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.signOut);

  function doExport() {
    const blob = new Blob([JSON.stringify(apps, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jobtrack-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported data");
  }

  async function doExportExcel() {
    if (!apps.length) {
      toast.error("Nothing to export yet.");
      return;
    }
    try {
      await exportApplicationsToXlsx(apps, user?.email ?? "jobtrack");
      toast.success("Exported Excel file");
    } catch {
      toast.error("Could not generate the Excel file.");
    }
  }

  async function doImport(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Application[];
      if (!Array.isArray(parsed)) throw new Error("Invalid file");
      await importData(parsed);
      toast.success(`Imported ${parsed.length} applications`);
    } catch {
      toast.error("Could not import — file must be a valid JSON export.");
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your preferences and data"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Choose the theme that feels right.
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              All data is stored locally in your browser and kept private to
              your account. You have {apps.length} applications saved.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={doExport}>
                <Download className="h-4 w-4" /> Export JSON
              </Button>
              <Button size="sm" onClick={() => void doExportExcel()}>
                <FileSpreadsheet className="h-4 w-4" /> Export Excel (.xlsx)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> Import JSON
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) doImport(f);
                  e.target.value = "";
                }}
              />
              {/* <Button variant="outline" size="sm" className="text-destructive" onClick={() => setConfirmClear(true)}>
                <Trash2 className="h-4 w-4" /> Clear all
              </Button> */}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {apps.length} applications from
              your browser. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                void clearAll();
                toast.success("All data cleared");
                setConfirmClear(false);
              }}
            >
              Clear data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
