import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

export function fmtDate(iso?: string, pattern = "MMM d, yyyy") {
  if (!iso) return "—";
  const d = parseISO(iso);
  if (!isValid(d)) return "—";
  return format(d, pattern);
}

export function fmtRelative(iso?: string) {
  if (!iso) return "";
  const d = parseISO(iso);
  if (!isValid(d)) return "";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function toDateInput(iso?: string) {
  if (!iso) return "";
  const d = parseISO(iso);
  if (!isValid(d)) return "";
  return format(d, "yyyy-MM-dd");
}
