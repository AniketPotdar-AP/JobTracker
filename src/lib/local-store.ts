const PREFIX = "jat";

export const storageKeys = {
  auth: `${PREFIX}.auth`,
  theme: `${PREFIX}.theme`,
  userData: (email: string) => `${PREFIX}.data.${email.toLowerCase()}`,
};

export function readLocal<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function removeLocal(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Removes every legacy/global key so the app starts from a clean, per-user state. */
export function purgeLegacyData() {
  if (typeof window === "undefined") return;
  ["jat.v1", "jobtrack", "applications"].forEach(removeLocal);
}
