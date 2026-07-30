import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUS_LABEL, type Status } from "@/lib/status";
import { toDateInput } from "@/lib/format";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  targetStatus: Status | null;
  onConfirm: (dateIso: string) => void;
};

export function StatusDateModal({ open, onOpenChange, companyName, targetStatus, onConfirm }: Props) {
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    if (open) {
      setDateStr(toDateInput(new Date().toISOString()));
    }
  }, [open]);

  if (!targetStatus) return null;

  function handleConfirm() {
    const iso = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
    onConfirm(iso);
    onOpenChange(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Select Status Date</AlertDialogTitle>
          <AlertDialogDescription>
            Updating status for <span className="font-semibold text-foreground">{companyName}</span> to{" "}
            <span className="font-semibold text-foreground">{STATUS_LABEL[targetStatus]}</span>.
            Select the date for this status change to show on your calendar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-3 space-y-2">
          <Label htmlFor="status-date">Date of status update</Label>
          <Input
            id="status-date"
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Save Status & Date
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
