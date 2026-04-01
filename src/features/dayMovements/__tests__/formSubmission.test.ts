import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractRespondentKeyFromUrl,
  submitDayMovementsForm,
  validateRespondentKey,
} from "../formSubmission.ts";
import { mapTimelineFormToPayload, type DayMovementsFormValues } from "../schema.ts";

const validPayload: DayMovementsFormValues = {
  birthday: "1990-05-15",
  gender: "MALE",
  socialStatus: "WORKING",
  homeAddress: {
    value: "ул. Ленина, д. 1",
    data: { geo_lat: "52.2978", geo_lon: "104.2964", house: "1" },
  },
  transportCostMin: 0,
  transportCostMax: 3000,
  incomeMin: 0,
  incomeMax: 50000,
  movementsDate: "2026-01-15",
  movements: [
    {
      movementType: "ON_FOOT",
      transport: [],
      waitBetweenTransfersMinutes: 0,
      departureTime: "08:00",
      departurePlace: "HOME_RESIDENCE",
      departureAddress: null,
      arrivalTime: "08:30",
      arrivalPlace: "WORKPLACE",
      arrivalAddress: {
        value: "ул. Карла Маркса, д. 5",
        data: { geo_lat: "52.3", geo_lon: "104.3", house: "5" },
      },
      comment: "",
    },
    {
      movementType: "ON_FOOT",
      transport: [],
      waitBetweenTransfersMinutes: 0,
      departureTime: "17:00",
      departurePlace: "WORKPLACE",
      departureAddress: {
        value: "ул. Карла Маркса, д. 5",
        data: { geo_lat: "52.3", geo_lon: "104.3", house: "5" },
      },
      arrivalTime: "17:30",
      arrivalPlace: "HOME_RESIDENCE",
      arrivalAddress: null,
      comment: "",
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("extractRespondentKeyFromUrl", () => {
  it("prefers respondentKey query parameter", () => {
    expect(
      extractRespondentKeyFromUrl("https://example.test/form?respondentKey=abc-123&key=fallback"),
    ).toBe("abc-123");
  });

  it("uses key query parameter when respondentKey is missing", () => {
    expect(extractRespondentKeyFromUrl("https://example.test/form?key=abc-123")).toBe("abc-123");
  });

  it("returns null when key is missing", () => {
    expect(extractRespondentKeyFromUrl("https://example.test/form")).toBeNull();
  });
});

describe("validateRespondentKey", () => {
  it("returns true for successful response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    await expect(validateRespondentKey("abc-123")).resolves.toBe(true);
  });

  it("returns false for invalid respondent key statuses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));

    await expect(validateRespondentKey("bad-key")).resolves.toBe(false);
  });
});

describe("submitDayMovementsForm", () => {
  it("sends respondent key in payload", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }));

    await submitDayMovementsForm(mapTimelineFormToPayload(validPayload), "abc-123");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    const body = requestInit?.body;
    expect(typeof body).toBe("string");
    expect(body).toContain('"respondentKey":"abc-123"');
  });
});
