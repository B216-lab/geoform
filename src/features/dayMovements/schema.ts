import { z } from "zod";
import i18n from "../../lib/i18n.ts";

/**
 * DaData address suggestion shape used in address fields.
 */
export const daDataAddressSchema = () =>
  z.object(
    {
      value: z.string(),
      unrestricted_value: z.string().optional(),
      data: z.record(z.unknown()),
    },
    {
      required_error: i18n.t("validation.required"),
      invalid_type_error: i18n.t("validation.required"),
    },
  );

export type DaDataAddressValue = z.infer<ReturnType<typeof daDataAddressSchema>>;

const requiredStringSchema = () =>
  z
    .string({
      required_error: i18n.t("validation.required"),
      invalid_type_error: i18n.t("validation.required"),
    })
    .min(1, i18n.t("validation.required"));

/**
 * Validates that a DaData suggestion contains a house number.
 */
function hasHouseNumber(val: DaDataAddressValue | null | undefined): boolean {
  if (!val?.data || typeof val.data !== "object") return false;
  return !!val.data.house;
}

function isSameAddress(
  left: DaDataAddressValue | null | undefined,
  right: DaDataAddressValue | null | undefined,
): boolean {
  if (!left || !right) return false;

  const leftHouseFiasId = String(left.data?.house_fias_id ?? "").trim();
  const rightHouseFiasId = String(right.data?.house_fias_id ?? "").trim();
  if (leftHouseFiasId && rightHouseFiasId) {
    return leftHouseFiasId === rightHouseFiasId;
  }

  const leftValue = String(left.unrestricted_value ?? left.value)
    .trim()
    .toLowerCase();
  const rightValue = String(right.unrestricted_value ?? right.value)
    .trim()
    .toLowerCase();
  return !!leftValue && leftValue === rightValue;
}

const addressWithHouseSchema = () =>
  daDataAddressSchema().refine(hasHouseNumber, {
    message: i18n.t("validation.addressMustContainHouse"),
  });

/**
 * A single movement entry within the day.
 */
export const movementSchema = () =>
  z
    .object({
      movementType: z.enum(["ON_FOOT", "TRANSPORT"]),

      // Transport-specific (required when movementType === "TRANSPORT")
      transport: z.array(z.string()).optional(),
      numberPeopleInCar: z.coerce.number().int().min(1).max(15).optional(),
      walkToStartMinutes: z.coerce.number().int().min(0).max(180).optional(),
      waitAtStartMinutes: z.coerce.number().int().min(0).max(180).optional(),
      numberOfTransfers: z.coerce.number().int().min(0).max(15).optional(),
      waitBetweenTransfersMinutes: z.coerce.number().int().min(0).max(180),

      // Departure
      departureTime: requiredStringSchema(),
      departurePlace: requiredStringSchema(),
      departureAddress: daDataAddressSchema().nullable().optional(),

      // Arrival
      arrivalTime: requiredStringSchema(),
      arrivalPlace: requiredStringSchema(),
      arrivalAddress: daDataAddressSchema().nullable().optional(),

      // Transport arrival extras
      walkFromFinishMinutes: z.coerce.number().int().min(0).max(180).optional(),
      tripCost: z.coerce.number().int().min(0).max(25000).nullable().optional(),

      comment: z.string().max(2000).optional(),
    })
    .superRefine((data, ctx) => {
      // Conditional: transport fields required when movementType is TRANSPORT
      if (data.movementType === "TRANSPORT") {
        if (!data.transport || data.transport.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: i18n.t("validation.selectAtLeastOneTransport"),
            path: ["transport"],
          });
        }
      }

      // Conditional: departureAddress required unless departurePlace is HOME_RESIDENCE
      if (data.departurePlace !== "HOME_RESIDENCE") {
        if (!data.departureAddress) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: i18n.t("validation.required"),
            path: ["departureAddress"],
          });
        } else if (!hasHouseNumber(data.departureAddress)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: i18n.t("validation.addressMustContainHouse"),
            path: ["departureAddress"],
          });
        }
      }

      // Conditional: arrivalAddress required unless arrivalPlace is HOME_RESIDENCE
      if (data.arrivalPlace !== "HOME_RESIDENCE") {
        if (!data.arrivalAddress) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: i18n.t("validation.required"),
            path: ["arrivalAddress"],
          });
        } else if (!hasHouseNumber(data.arrivalAddress)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: i18n.t("validation.addressMustContainHouse"),
            path: ["arrivalAddress"],
          });
        }
      }

      // Prevent zero-distance movement: home -> home or same address twice in a row.
      const sameHome =
        data.departurePlace === "HOME_RESIDENCE" && data.arrivalPlace === "HOME_RESIDENCE";
      const sameAddressPoint = isSameAddress(data.departureAddress, data.arrivalAddress);

      if (sameHome) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: i18n.t("validation.departureArrivalMustDiffer"),
          path: ["arrivalPlace"],
        });
      } else if (sameAddressPoint) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: i18n.t("validation.departureArrivalAddressMustDiffer"),
          path: ["arrivalPlace"],
        });
      }

      // Ensure arrivalTime is after departureTime within the same movement.
      if (data.departureTime && data.arrivalTime) {
        const depParts = data.departureTime.split(":").map(Number);
        const arrParts = data.arrivalTime.split(":").map(Number);
        const depH = depParts[0] ?? NaN;
        const depM = depParts[1] ?? NaN;
        const arrH = arrParts[0] ?? NaN;
        const arrM = arrParts[1] ?? NaN;
        const depMinutes = depH * 60 + depM;
        const arrMinutes = arrH * 60 + arrM;
        if (!Number.isNaN(depMinutes) && !Number.isNaN(arrMinutes) && arrMinutes <= depMinutes) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: i18n.t("validation.arrivalAfterDeparture"),
            path: ["arrivalTime"],
          });
        }
      }
    });

/**
 * Top-level form schema for the DayMovements form.
 */
export const dayMovementsSchema = () =>
  z.object({
    // Page 0 — general info
    birthday: requiredStringSchema(),
    gender: requiredStringSchema(),
    socialStatus: requiredStringSchema(),
    homeAddress: addressWithHouseSchema(),
    transportCostMin: z.coerce.number().int().min(0).max(20000),
    transportCostMax: z.coerce.number().int().min(0).max(20000),
    incomeMin: z.coerce.number().int().min(0).max(250000),
    incomeMax: z.coerce.number().int().min(0).max(250000),

    // Page 1 — movements
    movementsDate: requiredStringSchema(),
    movements: z
      .array(movementSchema())
      .min(2, i18n.t("validation.addAtLeastTwoMovements"))
      .max(15),
  });

export type DayMovementsFormValues = z.infer<ReturnType<typeof dayMovementsSchema>>;
export type MovementValues = z.infer<ReturnType<typeof movementSchema>>;

export interface SubmissionAddressPayload {
  value: string;
  latitude?: number;
  longitude?: number;
}

export interface SubmissionMovementPayload
  extends Omit<
    MovementValues,
    "departureAddress" | "arrivalAddress" | "waitBetweenTransfersMinutes" | "tripCost"
  > {
  departureAddress: SubmissionAddressPayload | null;
  arrivalAddress: SubmissionAddressPayload | null;
  waitBetweenTransfersMinutes: string;
  tripCost: string;
}

export interface DayMovementsSubmissionPayload
  extends Omit<DayMovementsFormValues, "homeAddress" | "movements"> {
  homeAddress: SubmissionAddressPayload;
  movements: SubmissionMovementPayload[];
}

export interface TimelineStartPoint {
  departureTime: string;
  departurePlace: string;
  departureAddress: DaDataAddressValue | null;
}

/**
 * Default values for a new empty movement entry.
 */
export const defaultMovement: Partial<MovementValues> = {
  movementType: "ON_FOOT",
  transport: [],
  numberOfTransfers: 0,
  waitBetweenTransfersMinutes: 0,
  departureTime: "",
  departurePlace: "",
  departureAddress: null,
  arrivalTime: "",
  arrivalPlace: "",
  arrivalAddress: null,
  comment: "",
};

/**
 * Default values for the entire form.
 */
export const defaultFormValues: Partial<DayMovementsFormValues> = {
  birthday: "",
  gender: "",
  socialStatus: "",
  homeAddress: undefined,
  transportCostMin: 0,
  transportCostMax: 3000,
  incomeMin: 0,
  incomeMax: 50000,
  movementsDate: "",
  movements: [{ ...defaultMovement } as MovementValues],
};

/**
 * Extracts start point values from the first movement.
 */
export function getTimelineStartPoint(movements: MovementValues[] | undefined): TimelineStartPoint {
  const first = movements?.[0];
  return {
    departureTime: first?.departureTime ?? "",
    departurePlace: first?.departurePlace ?? "",
    departureAddress: first?.departureAddress ?? null,
  };
}

/**
 * Creates a new movement linked from a previous arrival point.
 */
export function buildNextMovementFromPrevious(previous: MovementValues): MovementValues {
  return {
    ...(defaultMovement as MovementValues),
    departureTime: previous.arrivalTime ?? "",
    departurePlace: previous.arrivalPlace ?? "",
    departureAddress: previous.arrivalAddress ?? null,
  };
}

/**
 * Ensures departure fields are linearly chained:
 * movement[i].departure = movement[i - 1].arrival for i > 0.
 */
export function chainMovements(movements: MovementValues[] | undefined): MovementValues[] {
  if (!movements || movements.length === 0) {
    return [{ ...defaultMovement } as MovementValues];
  }

  const next = movements.map((m) => ({ ...m })) as MovementValues[];
  for (let i = 1; i < next.length; i++) {
    const prev = next[i - 1];
    const current = next[i];
    if (!prev || !current) continue;
    current.departureTime = prev.arrivalTime ?? "";
    current.departurePlace = prev.arrivalPlace ?? "";
    current.departureAddress = prev.arrivalAddress ?? null;
  }
  return next;
}

/**
 * Best-effort migration/normalization for drafts loaded from localStorage.
 */
export function normalizeDraft(
  draft: Partial<DayMovementsFormValues>,
): Partial<DayMovementsFormValues> {
  const normalized = { ...draft };
  if (!normalized.movements || normalized.movements.length === 0) {
    normalized.movements = [{ ...defaultMovement } as MovementValues];
    return normalized;
  }

  normalized.movements = chainMovements(normalized.movements as MovementValues[]).map(
    (movement) => ({
      ...movement,
      movementType: movement.movementType ?? "ON_FOOT",
    }),
  );
  return normalized;
}

/**
 * Maps timeline-edited form data to payload with guaranteed movement chaining.
 */
function parseOptionalCoordinate(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mapAddressToPayload(
  address: DaDataAddressValue | null | undefined,
): SubmissionAddressPayload | null {
  if (!address) {
    return null;
  }

  const payload: SubmissionAddressPayload = {
    value: address.value,
  };

  const latitude = parseOptionalCoordinate(address.data?.geo_lat);
  const longitude = parseOptionalCoordinate(address.data?.geo_lon);

  if (latitude !== undefined) {
    payload.latitude = latitude;
  }

  if (longitude !== undefined) {
    payload.longitude = longitude;
  }

  return payload;
}

export function mapTimelineFormToPayload(
  data: DayMovementsFormValues,
): DayMovementsSubmissionPayload {
  const homeAddress = mapAddressToPayload(data.homeAddress);

  if (!homeAddress) {
    throw new Error("homeAddress is required");
  }

  return {
    ...data,
    homeAddress,
    movements: chainMovements(data.movements as MovementValues[]).map((movement) => ({
      ...movement,
      departureAddress: mapAddressToPayload(movement.departureAddress),
      arrivalAddress: mapAddressToPayload(movement.arrivalAddress),
      waitBetweenTransfersMinutes: String(movement.waitBetweenTransfersMinutes ?? ""),
      tripCost:
        movement.tripCost === null || movement.tripCost === undefined
          ? ""
          : String(movement.tripCost),
    })),
  };
}
