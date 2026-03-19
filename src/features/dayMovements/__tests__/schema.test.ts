import { describe, expect, it } from "vitest";
import i18n from "../../../lib/i18n.ts";
import { type DayMovementsFormValues, dayMovementsSchema } from "../schema.ts";

function validFormData(): DayMovementsFormValues {
  return {
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
}

describe("dayMovementsSchema", () => {
  it("accepts valid form data", () => {
    const result = dayMovementsSchema().safeParse(validFormData());
    expect(result.success).toBe(true);
  });

  it("rejects empty birthday", () => {
    const data = validFormData();
    data.birthday = "";
    const result = dayMovementsSchema().safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects homeAddress without house number", () => {
    const data = validFormData();
    data.homeAddress = {
      value: "ул. Ленина",
      data: { geo_lat: "52.0", geo_lon: "104.0" },
    };
    const result = dayMovementsSchema().safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects empty movements array", () => {
    const data = validFormData();
    data.movements = [];
    const result = dayMovementsSchema().safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects a single movement", () => {
    const data = validFormData();
    data.movements = [data.movements[0]!];
    const result = dayMovementsSchema().safeParse(data);
    expect(result.success).toBe(false);
  });

  it("requires transport selection when movementType is TRANSPORT", () => {
    const data = validFormData();
    data.movements[0]!.movementType = "TRANSPORT";
    data.movements[0]!.transport = [];
    const result = dayMovementsSchema().safeParse(data);
    expect(result.success).toBe(false);
  });

  it("requires arrivalAddress with house when arrivalPlace is not HOME_RESIDENCE", () => {
    const data = validFormData();
    data.movements[0]!.arrivalPlace = "WORKPLACE";
    data.movements[0]!.arrivalAddress = null;
    const result = dayMovementsSchema().safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects HOME_RESIDENCE to non-home when addresses are identical", () => {
    const data = validFormData();
    data.movements[0]!.departurePlace = "HOME_RESIDENCE";
    data.movements[0]!.departureAddress = {
      value: "ул. Ленина, д. 1",
      data: { geo_lat: "52.2978", geo_lon: "104.2964", house: "1" },
    };
    data.movements[0]!.arrivalPlace = "KINDERGARTEN";
    data.movements[0]!.arrivalAddress = {
      value: "ул. Ленина, д. 1",
      data: { geo_lat: "52.2978", geo_lon: "104.2964", house: "1" },
    };

    const result = dayMovementsSchema().safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const addressEqualityIssue = result.error.issues.find(
        (issue) => issue.path.join(".") === "movements.0.arrivalPlace",
      );
      expect(addressEqualityIssue?.message).toBe(
        i18n.t("validation.departureArrivalAddressMustDiffer"),
      );
    }
  });

  it("allows HOME_RESIDENCE to non-home when addresses differ", () => {
    const data = validFormData();
    data.movements[0]!.departurePlace = "HOME_RESIDENCE";
    data.movements[0]!.departureAddress = {
      value: "ул. Ленина, д. 1",
      data: { geo_lat: "52.2978", geo_lon: "104.2964", house: "1" },
    };
    data.movements[0]!.arrivalPlace = "KINDERGARTEN";
    data.movements[0]!.arrivalAddress = {
      value: "ул. Карла Маркса, д. 5",
      data: { geo_lat: "52.3", geo_lon: "104.3", house: "5" },
    };

    const result = dayMovementsSchema().safeParse(data);
    expect(result.success).toBe(true);
  });

  it("allows movement when coordinates match but addresses differ", () => {
    const data = validFormData();
    data.movements[0]!.departurePlace = "HOME_RESIDENCE";
    data.movements[0]!.departureAddress = {
      value: "ул. Ленина, д. 1",
      unrestricted_value: "г Иркутск, ул Ленина, д 1",
      data: { geo_lat: "52.2978", geo_lon: "104.2964", house: "1" },
    };
    data.movements[0]!.arrivalPlace = "DAYCARE_CENTER";
    data.movements[0]!.arrivalAddress = {
      value: "ул. Карла Маркса, д. 5",
      unrestricted_value: "г Иркутск, ул Карла Маркса, д 5",
      data: { geo_lat: "52.2978", geo_lon: "104.2964", house: "5" },
    };

    const result = dayMovementsSchema().safeParse(data);
    expect(result.success).toBe(true);
  });
});
