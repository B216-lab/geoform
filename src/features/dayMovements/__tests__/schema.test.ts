import { describe, expect, it } from "vitest";
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
});
