import { useCallback, useEffect, useRef, useState } from "react";
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Card,
  Grid,
  Group,
  NumberInput,
  Select,
  Stack,
  Stepper,
  Text,
  TextInput,
  Timeline,
} from "@mantine/core";
import { TimePicker } from "@mantine/dates";
import { IconClockHour3, IconMapPin } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { AddressAutocomplete } from "../../components/ui/AddressAutocomplete.tsx";
import { ArrivalPointItem } from "./ArrivalPointItem.tsx";
import { MovementItem } from "./MovementItem.tsx";
import { SuccessScreen } from "../../components/SuccessScreen.tsx";
import {
  buildNextMovementFromPrevious,
  chainMovements,
  type DayMovementsFormValues,
  dayMovementsSchema,
  defaultFormValues,
  getTimelineStartPoint,
  mapTimelineFormToPayload,
  movementSchema,
  type MovementValues,
} from "./schema.ts";
import { enumToOptions, Gender, Place, SocialStatus } from "./enums.ts";
import { useDaDataAddress } from "./useDaDataAddress.ts";
import { submitDayMovementsForm } from "./formSubmission.ts";
import { useDraftStore } from "./store.ts";
import { ApiHttpError, ApiNetworkError } from "../../lib/api.ts";
import type { DaDataAddressSuggestion } from "./addressUtils.ts";

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

const toError = (message: unknown) =>
  typeof message === "string" ? message : undefined;

const hasHouseNumber = (
  address: DaDataAddressSuggestion | null | undefined,
): boolean => !!address?.data?.house;

const isMovementLegReady = (
  movement: MovementValues | undefined,
): boolean => {
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

const isStartPointReady = (
  movement: MovementValues | undefined,
): boolean => {
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

export function DayMovementsForm() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const genderOptions = enumToOptions(Gender, t, "enums.gender");
  const socialStatusOptions = enumToOptions(
    SocialStatus,
    t,
    "enums.socialStatus",
  );
  const placeOptions = enumToOptions(Place, t, "enums.place");

  const getPlaceLabel = (placeCode: string | undefined): string => {
    if (!placeCode) return t("common.unspecified");
    return t(`enums.place.${placeCode}`, { defaultValue: placeCode });
  };

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { draft, saveDraft, clearMovements, isRestored, markRestored } =
    useDraftStore();

  const initialValues = isRestored
    ? { ...defaultFormValues, ...draft }
    : defaultFormValues;

  const methods = useForm<DayMovementsFormValues>({
    resolver: zodResolver(dayMovementsSchema()),
    defaultValues: initialValues as DayMovementsFormValues,
    mode: "onTouched",
  });

  const {
    register,
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

  const { getAddressItems, ADDRESS_DELAY, DEFAULT_MIN_CHARS } =
    useDaDataAddress(3);

  useEffect(() => {
    if (!isRestored) markRestored();
  }, [isRestored, markRestored]);

  const watchedValues = useWatch({ control });
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft(watchedValues as DayMovementsFormValues);
    }, 800);
    return () => clearTimeout(timer);
  }, [watchedValues, saveDraft]);

  const movements = useWatch({ control, name: "movements" });
  const movementChainSignature = JSON.stringify(
    (movements ?? []).map((m) => ({
      arrivalPlace: m?.arrivalPlace ?? "",
      arrivalAddressValue: m?.arrivalAddress?.value ?? "",
      departurePlace: m?.departurePlace ?? "",
      departureAddressValue: m?.departureAddress?.value ?? "",
    })),
  );

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

      if (
        (currDepartureAddress?.value ?? "") !==
          (nextDepartureAddress?.value ?? "")
      ) {
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
  }, [movementChainSignature, movements, setValue, getValues, clearErrors]);

  const goToNextStep = useCallback(async () => {
    const valid = await trigger(
      PAGE0_FIELDS as unknown as (keyof DayMovementsFormValues)[],
    );
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
        await submitDayMovementsForm(payload);
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
    [clearMovements, t],
  );

  const handleFillAnother = useCallback(() => {
    setIsSubmitted(false);
    setStep(0);
    methods.reset(defaultFormValues as DayMovementsFormValues);
  }, [methods]);

  if (isSubmitted) {
    return <SuccessScreen onFillAnother={handleFillAnother} />;
  }

  const movementsDate = getValues("movementsDate");
  const isMovementsDateSet = Boolean(movementsDate);
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
  const chainedMovements = chainMovements(
    (movements as MovementValues[] | undefined) ?? [],
  );
  const isFirstDepartureReady = isStartPointReady(chainedMovements[0]);
  const allMovementsComplete = chainedMovements.every((movement) =>
    movementSchema().safeParse(movement).success
  );
  const canAddMovement = isMovementsDateSet && fields.length < 15 &&
    allMovementsComplete;
  const movementsDateMax = new Date().toISOString().slice(0, 10);
  const previousStartPlaceRef = useRef<string | undefined>(startDeparturePlace);

  useEffect(() => {
    if (
      startDeparturePlace === "HOME_RESIDENCE" &&
      homeAddress &&
      (startDepartureAddress?.value ?? "") !== homeAddress.value
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
      startDepartureAddress
    ) {
      setValue("movements.0.departureAddress", null, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }

    previousStartPlaceRef.current = startDeparturePlace;
  }, [
    startDeparturePlace,
    homeAddress,
    startDepartureAddress?.value,
    setValue,
  ]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card withBorder radius="md" p="lg" shadow="xs">
          <Stepper
            active={step}
            onStepClick={setStep}
            allowNextStepsSelect={false}
            iconSize={28}
          >
            <Stepper.Step label={t("form.stepGeneral")} />
            <Stepper.Step label={t("form.stepMovements")} />
          </Stepper>

          <Stack mt="lg" gap="md">
            {step === 0 && (
              <>
                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <TextInput
                      type="date"
                      min="1956-12-01"
                      max="2018-12-01"
                      label={t("form.birthday")}
                      error={toError(errors.birthday?.message)}
                      {...register("birthday", {
                        onChange: () => {
                          void trigger("birthday");
                        },
                      })}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <Controller
                      control={control}
                      name="gender"
                      render={({ field }) => (
                        <Select
                          label={t("form.gender")}
                          data={genderOptions}
                          value={field.value ?? null}
                          onChange={(value) => {
                            field.onChange(value);
                            void trigger("gender");
                          }}
                          searchable
                          error={toError(errors.gender?.message)}
                        />
                      )}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <Controller
                      control={control}
                      name="socialStatus"
                      render={({ field }) => (
                        <Select
                          label={t("form.socialStatus")}
                          data={socialStatusOptions}
                          value={field.value ?? null}
                          onChange={(value) => {
                            field.onChange(value);
                            void trigger("socialStatus");
                          }}
                          searchable
                          error={toError(errors.socialStatus?.message)}
                        />
                      )}
                    />
                  </Grid.Col>
                </Grid>

                <Controller
                  control={control}
                  name="homeAddress"
                  render={({ field }) => (
                    <AddressAutocomplete
                      value={field.value as DaDataAddressSuggestion | null}
                      onChange={(val) => {
                        field.onChange(
                          val as DayMovementsFormValues["homeAddress"],
                        );
                        void trigger("homeAddress");
                      }}
                      getAddressItems={getAddressItems}
                      delay={ADDRESS_DELAY}
                      minChars={DEFAULT_MIN_CHARS}
                      label={t("form.homeAddress")}
                      description={t("form.homeAddressDescription")}
                      error={toError(errors.homeAddress?.message)}
                    />
                  )}
                />

                <Stack gap="xs">
                  <Text fw={600}>
                    {t("form.transportCostsTitle", {
                      period: t("common.currencyPerMonth"),
                    })}
                  </Text>
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Controller
                        control={control}
                        name="transportCostMin"
                        render={({ field }) => (
                          <NumberInput
                            label={t("common.min")}
                            min={0}
                            max={20000}
                            leftSection="₽"
                            value={field.value ?? 0}
                            onChange={field.onChange}
                            error={toError(errors.transportCostMin?.message)}
                          />
                        )}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Controller
                        control={control}
                        name="transportCostMax"
                        render={({ field }) => (
                          <NumberInput
                            label={t("common.max")}
                            min={0}
                            max={20000}
                            leftSection="₽"
                            value={field.value ?? 3000}
                            onChange={field.onChange}
                            error={toError(errors.transportCostMax?.message)}
                          />
                        )}
                      />
                    </Grid.Col>
                  </Grid>
                </Stack>

                <Stack gap="xs">
                  <Text fw={600}>
                    {t("form.incomeTitle", {
                      period: t("common.currencyPerMonth"),
                    })}
                  </Text>
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Controller
                        control={control}
                        name="incomeMin"
                        render={({ field }) => (
                          <NumberInput
                            label={t("common.min")}
                            min={0}
                            max={250000}
                            leftSection="₽"
                            value={field.value ?? 0}
                            onChange={field.onChange}
                            error={toError(errors.incomeMin?.message)}
                          />
                        )}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Controller
                        control={control}
                        name="incomeMax"
                        render={({ field }) => (
                          <NumberInput
                            label={t("common.max")}
                            min={0}
                            max={250000}
                            leftSection="₽"
                            value={field.value ?? 50000}
                            onChange={field.onChange}
                            error={toError(errors.incomeMax?.message)}
                          />
                        )}
                      />
                    </Grid.Col>
                  </Grid>
                </Stack>

                <Group justify="flex-end">
                  <Button onClick={goToNextStep}>{t("common.next")}</Button>
                </Group>
              </>
            )}

            {step === 1 && (
              <>
                <TextInput
                  type="date"
                  label={t("form.movementsDate")}
                  withAsterisk
                  description={t("form.movementsDateDescription")}
                  max={movementsDateMax}
                  error={toError(errors.movementsDate?.message)}
                  {...register("movementsDate")}
                />

                {isMovementsDateSet && (
                  <>
                    <Timeline
                      bulletSize={24}
                      lineWidth={2}
                      active={Math.max(fields.length, 0)}
                    >
                      <Timeline.Item
                        bullet={<IconMapPin size={12} />}
                      >
                        <Card withBorder radius="md" p="md">
                          <Stack gap="sm">
                            <Text fw={600}>{t("form.departure")}</Text>
                            <Grid>
                              <Grid.Col span={{ base: 12, sm: 4 }}>
                                <Controller
                                  control={control}
                                  name="movements.0.departureTime"
                                  render={({ field }) => (
                                    <TimePicker
                                      label={t("form.time")}
                                      withAsterisk
                                      value={field.value ?? ""}
                                      onChange={field.onChange}
                                      format="24h"
                                      withSeconds={false}
                                      leftSection={<IconClockHour3 size={16} />}
                                      error={toError(
                                        errors.movements?.[0]?.departureTime
                                          ?.message,
                                      )}
                                    />
                                  )}
                                />
                              </Grid.Col>
                              <Grid.Col span={{ base: 12, sm: 8 }}>
                                <Controller
                                  control={control}
                                  name="movements.0.departurePlace"
                                  render={({ field }) => (
                                    <Select
                                      label={t("form.point")}
                                      withAsterisk
                                      data={placeOptions}
                                      searchable
                                      value={field.value ?? null}
                                      onChange={field.onChange}
                                      error={toError(
                                        errors.movements?.[0]?.departurePlace
                                          ?.message,
                                      )}
                                    />
                                  )}
                                />
                              </Grid.Col>
                            </Grid>
                            <Controller
                              control={control}
                              name="movements.0.departureAddress"
                              render={({ field }) => (
                                <AddressAutocomplete
                                  value={field.value as
                                    | DaDataAddressSuggestion
                                    | null}
                                  onChange={field.onChange}
                                  getAddressItems={getAddressItems}
                                  delay={ADDRESS_DELAY}
                                  minChars={DEFAULT_MIN_CHARS}
                                  disabled={startDeparturePlace ===
                                    "HOME_RESIDENCE"}
                                  label={t("form.address")}
                                  withAsterisk
                                  description={startDeparturePlace ===
                                      "HOME_RESIDENCE"
                                    ? t("form.homeAddressAutofill")
                                    : t("form.homeAddressDescription")}
                                  error={toError(
                                    errors.movements?.[0]?.departureAddress
                                      ?.message,
                                  )}
                                />
                              )}
                            />
                          </Stack>
                        </Card>
                      </Timeline.Item>

                      {isFirstDepartureReady &&
                        fields.flatMap((field, index) => {
                          const previousPlaceLabel = index === 0
                            ? getPlaceLabel(timelineStartPoint.departurePlace)
                            : getPlaceLabel(
                              movements?.[index - 1]?.arrivalPlace,
                            );
                          const previousAddressLabel = index === 0
                            ? (timelineStartPoint.departureAddress?.value ??
                              null)
                            : (movements?.[index - 1]?.arrivalAddress?.value ??
                              null);

                          const items = [
                            <Timeline.Item key={field.id}>
                              <MovementItem
                                index={index}
                                onRemove={() => remove(index)}
                                canRemove={fields.length > 1}
                                previousPlaceLabel={previousPlaceLabel}
                                previousAddressLabel={previousAddressLabel}
                              />
                            </Timeline.Item>,
                          ];

                          if (isMovementLegReady(chainedMovements[index])) {
                            items.push(
                              <Timeline.Item
                                key={`${field.id}-arrival`}
                                bullet={<IconMapPin size={12} />}
                              >
                                <ArrivalPointItem
                                  index={index}
                                  homeAddress={homeAddress ?? null}
                                  getAddressItems={getAddressItems}
                                  addressDelay={ADDRESS_DELAY}
                                  addressMinChars={DEFAULT_MIN_CHARS}
                                />
                              </Timeline.Item>,
                            );
                          }

                          return items;
                        })}
                    </Timeline>

                    {isFirstDepartureReady && canAddMovement && (
                      <Button
                        variant="light"
                        onClick={addMovementIfPreviousValid}
                      >
                        {t("form.addMovement")}
                      </Button>
                    )}
                  </>
                )}

                {submitError && <Alert color="red">{submitError}</Alert>}

                <Group justify="space-between">
                  <Button variant="default" onClick={goToPreviousStep}>
                    {t("common.back")}
                  </Button>
                  <Button type="submit" loading={isSubmitting}>
                    {t("common.finish")}
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        </Card>
      </form>
    </FormProvider>
  );
}
