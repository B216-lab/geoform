import { create } from "zustand";
import type { DayMovementsFormValues } from "./schema";

const STORAGE_KEY = "form";

/**
 * Thin draft persistence store.
 *
 * react-hook-form owns the live field state.
 * This store only holds a serialised snapshot that is periodically
 * written to localStorage and read back on mount.
 */
interface DraftState {
  /** Latest snapshot persisted to localStorage */
  draft: Partial<DayMovementsFormValues>;
  /** When the last save happened (ISO string) */
  lastSavedAt: string | null;
  /** Whether the draft has already been read and applied to RHF */
  isRestored: boolean;

  /** Persist a snapshot of the form values */
  saveDraft: (values: DayMovementsFormValues) => void;
  /** Clear only the movements portion (called on successful submit) */
  clearMovements: () => void;
  /** Mark the draft as already restored into RHF */
  markRestored: () => void;
}

function getStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readFromStorage(): Partial<DayMovementsFormValues> {
  try {
    const raw = getStorage()?.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<DayMovementsFormValues>;
  } catch {
    return {};
  }
}

function writeToStorage(data: Partial<DayMovementsFormValues>): void {
  try {
    getStorage()?.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export const useDraftStore = create<DraftState>((set, get) => ({
  draft: readFromStorage(),
  lastSavedAt: null,
  isRestored: Object.keys(readFromStorage()).length > 0,

  saveDraft: (values) => {
    writeToStorage(values);
    set({ draft: values, lastSavedAt: new Date().toISOString() });
  },

  clearMovements: () => {
    const current = get().draft;
    const updated = { ...current, movements: undefined };
    writeToStorage(updated);
    set({ draft: updated });
  },

  markRestored: () => set({ isRestored: true }),
}));
