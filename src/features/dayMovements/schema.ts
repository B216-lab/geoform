import { z } from "zod";

/**
 * DaData address suggestion shape used in address fields.
 */
export const daDataAddressSchema = z.object({
  value: z.string(),
  unrestricted_value: z.string().optional(),
  data: z.record(z.unknown()),
});

export type DaDataAddressValue = z.infer<typeof daDataAddressSchema>;

/**
 * Validates that a DaData suggestion contains a house number.
 */
function hasHouseNumber(val: DaDataAddressValue | null | undefined): boolean {
  if (!val?.data || typeof val.data !== "object") return false;
  return !!val.data.house;
}

const addressWithHouseSchema = daDataAddressSchema.refine(hasHouseNumber, {
  message: "Адрес должен содержать номер дома",
});

/**
 * A single movement entry within the day.
 */
export const movementSchema = z
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
    departureTime: z.string().min(1, "Обязательное поле"),
    departurePlace: z.string().min(1, "Обязательное поле"),
    departureAddress: daDataAddressSchema.nullable().optional(),

    // Arrival
    arrivalTime: z.string().min(1, "Обязательное поле"),
    arrivalPlace: z.string().min(1, "Обязательное поле"),
    arrivalAddress: daDataAddressSchema.nullable().optional(),

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
          message: "Выберите хотя бы один тип транспорта",
          path: ["transport"],
        });
      }
    }

    // Conditional: departureAddress required unless departurePlace is HOME_RESIDENCE
    if (data.departurePlace !== "HOME_RESIDENCE") {
      if (!data.departureAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Обязательное поле",
          path: ["departureAddress"],
        });
      } else if (!hasHouseNumber(data.departureAddress)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Адрес должен содержать номер дома",
          path: ["departureAddress"],
        });
      }
    }

    // Conditional: arrivalAddress required unless arrivalPlace is HOME_RESIDENCE
    if (data.arrivalPlace !== "HOME_RESIDENCE") {
      if (!data.arrivalAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Обязательное поле",
          path: ["arrivalAddress"],
        });
      } else if (!hasHouseNumber(data.arrivalAddress)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Адрес должен содержать номер дома",
          path: ["arrivalAddress"],
        });
      }
    }
  });

/**
 * Top-level form schema for the DayMovements form.
 */
export const dayMovementsSchema = z.object({
  // Page 0 — general info
  birthday: z.string().min(1, "Обязательное поле"),
  gender: z.string().min(1, "Обязательное поле"),
  socialStatus: z.string().min(1, "Обязательное поле"),
  homeAddress: addressWithHouseSchema,
  transportCostMin: z.coerce.number().int().min(0).max(20000),
  transportCostMax: z.coerce.number().int().min(0).max(20000),
  incomeMin: z.coerce.number().int().min(0).max(250000),
  incomeMax: z.coerce.number().int().min(0).max(250000),

  // Page 1 — movements
  movementsDate: z.string().min(1, "Обязательное поле"),
  movements: z
    .array(movementSchema)
    .min(1, "Добавьте хотя бы одно передвижение")
    .max(15),
});

export type DayMovementsFormValues = z.infer<typeof dayMovementsSchema>;
export type MovementValues = z.infer<typeof movementSchema>;

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
