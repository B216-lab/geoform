import { describe, it, expect, beforeEach, vi } from "vitest";
import { useDraftStore } from "../store";
import type { DayMovementsFormValues, MovementValues } from "../schema";

// Provide a proper localStorage mock for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });
Object.defineProperty(window, "localStorage", { value: localStorageMock });

function makeDraft(): DayMovementsFormValues {
  return {
    birthday: "1990-01-01",
    gender: "MALE",
    socialStatus: "WORKING",
    homeAddress: {
      value: "test",
      data: { house: "1", geo_lat: "52", geo_lon: "104" },
    },
    transportCostMin: 0,
    transportCostMax: 3000,
    incomeMin: 0,
    incomeMax: 50000,
    movementsDate: "2026-01-01",
    movements: [
      {
        movementType: "ON_FOOT",
        departureTime: "08:00",
        departurePlace: "HOME_RESIDENCE",
        arrivalTime: "08:30",
        arrivalPlace: "WORKPLACE",
        waitBetweenTransfersMinutes: 0,
      } as MovementValues,
    ],
  };
}

describe("useDraftStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset zustand store between tests
    useDraftStore.setState({
      draft: {},
      lastSavedAt: null,
      isRestored: false,
    });
  });

  it("saveDraft writes to localStorage and updates state", () => {
    const draft = makeDraft();
    useDraftStore.getState().saveDraft(draft);

    expect(useDraftStore.getState().draft).toEqual(draft);
    expect(useDraftStore.getState().lastSavedAt).toBeTruthy();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "form",
      JSON.stringify(draft),
    );
  });

  it("clearMovements removes movements from draft and storage", () => {
    const draft = makeDraft();
    useDraftStore.getState().saveDraft(draft);
    useDraftStore.getState().clearMovements();

    const state = useDraftStore.getState();
    expect(state.draft.movements).toBeUndefined();

    // Check that the last setItem call excluded movements
    const lastSetCall = localStorageMock.setItem.mock.calls.at(-1);
    expect(lastSetCall).toBeTruthy();
    const stored = JSON.parse(lastSetCall![1] as string);
    expect(stored.movements).toBeUndefined();
  });

  it("markRestored sets isRestored to true", () => {
    expect(useDraftStore.getState().isRestored).toBe(false);
    useDraftStore.getState().markRestored();
    expect(useDraftStore.getState().isRestored).toBe(true);
  });
});
