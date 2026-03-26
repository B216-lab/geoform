import { zodResolver } from "@hookform/resolvers/zod";
import { Card, Stack, Stepper } from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { type FieldErrors, FormProvider, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { SuccessScreen } from "../../components/SuccessScreen.tsx";
import { ApiHttpError, ApiNetworkError } from "../../lib/api.ts";
import type { DaDataAddressSuggestion } from "./addressUtils.ts";
import { enumToOptions, Gender, Place, SocialStatus } from "./enums.ts";
import { submitDayMovementsForm } from "./formSubmission.ts";
import { GeneralInfoStep } from "./GeneralInfoStep.tsx";
import { MovementsStep } from "./MovementsStep.tsx";
import {
  buildNextMovementFromPrevious,
  chainMovements,
  type DayMovementsFormValues,
  dayMovementsSchema,
  defaultFormValues,
  getTimelineStartPoint,
  type MovementValues,
  mapTimelineFormToPayload,
  movementSchema,
} from "./schema.ts";
import { useDraftStore } from "./store.ts";
import { useDaDataAddress } from "./useDaDataAddress.ts";

const PAGE0_FIELDS = [
  "birthday",
  "gender",
  "socialStatus",
  "homeAddress",
  "transportCostMin",
  "transportCostMax",
  "incomeMin",
  "incomeMax",
] as const;

const getMovementsArrayError = (
  movementErrors: FieldErrors<DayMovementsFormValues>["movements"],
): string | undefined => {
  if (!movementErrors || typeof movementErrors !== "object") return undefined;

  const maybeDirectMessage = (movementErrors as { message?: unknown }).message;
  if (typeof maybeDirectMessage === "string") return maybeDirectMessage;

  const maybeRoot = (movementErrors as { root?: { message?: unknown } }).root;
  const maybeRootMessage = maybeRoot?.message;
  return typeof maybeRootMessage === "string" ? maybeRootMessage : undefined;
};

const hasHouseNumber = (address: DaDataAddressSuggestion | null | undefined): boolean =>
  !!address?.data?.house;

const isMovementLegReady = (movement: MovementValues | undefined): boolean => {
  if (!movement) return false;
  if (!movement.movementType) return false;
  if (!movement.departureTime || !movement.departurePlace) return false;
  if (
    movement.departurePlace !== "HOME_RESIDENCE" &&
    !hasHouseNumber(movement.departureAddress as DaDataAddressSuggestion | null)
  ) {
    return false;
  }
  if (
    movement.movementType === "TRANSPORT" &&
    (!movement.transport || movement.transport.length === 0)
  ) {
    return false;
  }
  return true;
};

const isStartPointReady = (movement: MovementValues | undefined): boolean => {
  if (!movement) return false;
  if (!movement.departureTime || !movement.departurePlace) return false;
  if (
    movement.departurePlace !== "HOME_RESIDENCE" &&
    !hasHouseNumber(movement.departureAddress as DaDataAddressSuggestion | null)
  ) {
    return false;
  }
  return true;
};

export function DayMovementsForm({ respondentKey }: { respondentKey: string }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const genderOptions = enumToOptions(Gender, t, "enums.gender");
  const socialStatusOptions = enumToOptions(SocialStatus, t, "enums.socialStatus");
  const placeOptions = enumToOptions(Place, t, "enums.place");

  const getPlaceLabel = (placeCode: string | undefined): string => {
    if (!placeCode) return t("common.unspecified");
    return t(`enums.place.${placeCode}`, { defaultValue: placeCode });
  };

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { draft, saveDraft, clearMovements, isRestored } = useDraftStore();

  const initialValues = isRestored ? { ...defaultFormValues, ...draft } : defaultFormValues;

  const methods = useForm<DayMovementsFormValues>({
    resolver: zodResolver(dayMovementsSchema()),
    defaultValues: initialValues as DayMovementsFormValues,
    mode: "onTouched",
  });

  const {
    handleSubmit,
    control,
    trigger,
    formState: { errors },
    setValue,
    clearErrors,
    getValues,
  } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "movements",
  });

  const { getAddressItems, ADDRESS_DELAY, DEFAULT_MIN_CHARS } = useDaDataAddress(3);

  const watchedValues = useWatch({ control });
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft(watchedValues as DayMovementsFormValues);
    }, 800);
    return () => clearTimeout(timer);
  }, [watchedValues, saveDraft]);

  const movements = useWatch({ control, name: "movements" });

  useEffect(() => {
    if (!movements || movements.length === 0) return;

    const chained = chainMovements(movements as MovementValues[]);
    for (let i = 1; i < chained.length; i++) {
      const nextMovement = chained[i];
      if (!nextMovement) continue;
      const currDeparturePlace = getValues(`movements.${i}.departurePlace`);
      const currDepartureAddress = getValues(`movements.${i}.departureAddress`);
      const nextDeparturePlace = nextMovement.departurePlace ?? "";
      const nextDepartureAddress = nextMovement.departureAddress ?? null;

      if (currDeparturePlace !== nextDeparturePlace) {
        setValue(`movements.${i}.departurePlace`, nextDeparturePlace, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        });
        if (nextDeparturePlace) {
          clearErrors(`movements.${i}.departurePlace`);
        }
      }

      if ((currDepartureAddress?.value ?? "") !== (nextDepartureAddress?.value ?? "")) {
        setValue(`movements.${i}.departureAddress`, nextDepartureAddress, {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        });
        if (hasHouseNumber(nextDepartureAddress)) {
          clearErrors(`movements.${i}.departureAddress`);
        }
      }
    }
  }, [movements, setValue, getValues, clearErrors]);

  const goToNextStep = useCallback(async () => {
    const valid = await trigger(PAGE0_FIELDS as unknown as (keyof DayMovementsFormValues)[]);
    if (valid) setStep(1);
  }, [trigger]);

  const goToPreviousStep = useCallback(() => setStep(0), []);

  const addMovementIfPreviousValid = useCallback(() => {
    const lastIndex = fields.length - 1;
    if (lastIndex < 0) return;
    const lastMovement = getValues(`movements.${lastIndex}`) as MovementValues;
    append(buildNextMovementFromPrevious(lastMovement));
  }, [append, fields.length, getValues]);

  const onSubmit = useCallback(
    async (data: DayMovementsFormValues) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const payload = mapTimelineFormToPayload(data);
        await submitDayMovementsForm(payload, respondentKey);
        setIsSubmitted(true);
        clearMovements();
      } catch (err) {
        if (err instanceof ApiNetworkError || err instanceof ApiHttpError) {
          setSubmitError(err.message || t("errors.submitFailed"));
        } else {
          setSubmitError(t("errors.submitUnexpected"));
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [clearMovements, respondentKey, t],
  );

  const handleFillAnother = useCallback(() => {
    setIsSubmitted(false);
    setStep(0);
    methods.reset(defaultFormValues as DayMovementsFormValues);
  }, [methods]);

  const onInvalidSubmit = useCallback((formErrors: FieldErrors<DayMovementsFormValues>) => {
    setSubmitError(null);
    const hasPage0Errors = PAGE0_FIELDS.some((fieldName) => Boolean(formErrors[fieldName]));

    setStep(hasPage0Errors ? 0 : 1);
  }, []);

  const movementsDate = getValues("movementsDate");
  const isMovementsDateSet = Boolean(movementsDate);
  const movementsError = getMovementsArrayError(errors.movements);
  const homeAddress = useWatch({ control, name: "homeAddress" }) as
    | DaDataAddressSuggestion
    | null
    | undefined;
  const startDeparturePlace = useWatch({
    control,
    name: "movements.0.departurePlace",
  });
  const startDepartureAddress = useWatch({
    control,
    name: "movements.0.departureAddress",
  }) as DaDataAddressSuggestion | null | undefined;
  const timelineStartPoint = getTimelineStartPoint(
    (movements as MovementValues[] | undefined) ?? [],
  );
  const chainedMovements = chainMovements((movements as MovementValues[] | undefined) ?? []);
  const isFirstDepartureReady = isStartPointReady(chainedMovements[0]);
  const allMovementsComplete = chainedMovements.every(
    (movement) => movementSchema().safeParse(movement).success,
  );
  const canAddMovement = isMovementsDateSet && fields.length < 15 && allMovementsComplete;
  const movementsDateMax = new Date().toISOString().slice(0, 10);
  const previousStartPlaceRef = useRef<string | undefined>(startDeparturePlace);
  const startDepartureAddressValue = startDepartureAddress?.value;

  useEffect(() => {
    if (
      startDeparturePlace === "HOME_RESIDENCE" &&
      homeAddress &&
      (startDepartureAddressValue ?? "") !== homeAddress.value
    ) {
      setValue("movements.0.departureAddress", homeAddress, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }

    if (
      previousStartPlaceRef.current === "HOME_RESIDENCE" &&
      startDeparturePlace !== "HOME_RESIDENCE" &&
      startDepartureAddressValue
    ) {
      setValue("movements.0.departureAddress", null, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }

    previousStartPlaceRef.current = startDeparturePlace;
  }, [startDeparturePlace, homeAddress, startDepartureAddressValue, setValue]);

  if (isSubmitted) {
    return <SuccessScreen onFillAnother={handleFillAnother} />;
  }

  return (
    <FormProvider {...methods}>
      <form
        data-testid="day-movements-form"
        onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
        noValidate
      >
        <Card withBorder radius="md" p="lg" shadow="xs">
          <Stepper active={step} onStepClick={setStep} allowNextStepsSelect={false} iconSize={28}>
            <Stepper.Step label={t("form.stepGeneral")} />
            <Stepper.Step label={t("form.stepMovements")} />
          </Stepper>

          <Stack mt="lg" gap="md">
            {step === 0 && (
              <GeneralInfoStep
                genderOptions={genderOptions}
                socialStatusOptions={socialStatusOptions}
                getAddressItems={getAddressItems}
                addressDelay={ADDRESS_DELAY}
                addressMinChars={DEFAULT_MIN_CHARS}
                onNext={goToNextStep}
              />
            )}

            {step === 1 && (
              <MovementsStep
                placeOptions={placeOptions}
                timeline={{
                  movementsDateMax,
                  isMovementsDateSet,
                  fields,
                  movements: movements as MovementValues[] | undefined,
                  chainedMovements,
                  timelineStartPoint,
                  isFirstDepartureReady,
                  canAddMovement,
                  startDeparturePlace,
                  homeAddress,
                }}
                addressConfig={{
                  getAddressItems,
                  delay: ADDRESS_DELAY,
                  minChars: DEFAULT_MIN_CHARS,
                }}
                actions={{
                  onAddMovement: addMovementIfPreviousValid,
                  onRemoveMovement: remove,
                  onBack: goToPreviousStep,
                  getPlaceLabel,
                  isMovementLegReady,
                }}
                status={{
                  movementsError,
                  submitError,
                  isSubmitting,
                }}
              />
            )}
          </Stack>
        </Card>
      </form>
    </FormProvider>
  );
}
