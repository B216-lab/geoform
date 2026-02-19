import { useState, useEffect, useCallback, useRef } from "react";
import {
  useForm,
  useFieldArray,
  FormProvider,
  useWatch,
  Controller,
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
  Timeline,
  TextInput,
} from "@mantine/core";
import { TimePicker } from "@mantine/dates";
import { IconClockHour3, IconMapPin } from "@tabler/icons-react";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { ArrivalPointItem } from "./ArrivalPointItem";
import { MovementItem } from "./MovementItem";
import { SuccessScreen } from "@/components/SuccessScreen";
import {
  buildNextMovementFromPrevious,
  chainMovements,
  dayMovementsSchema,
  defaultFormValues,
  getTimelineStartPoint,
  mapTimelineFormToPayload,
  movementSchema,
  type DayMovementsFormValues,
  type MovementValues,
} from "./schema";
import { enumToOptions, Gender, Place, SocialStatus } from "./enums";
import { useDaDataAddress } from "./useDaDataAddress";
import { submitDayMovementsForm } from "./formSubmission";
import { useDraftStore } from "./store";
import { ApiHttpError, ApiNetworkError } from "@/lib/api";
import type { DaDataAddressSuggestion } from "./addressUtils";

const genderOptions = enumToOptions(Gender);
const socialStatusOptions = enumToOptions(SocialStatus);

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

const getPlaceLabel = (placeCode: string | undefined): string => {
  if (!placeCode) return "Не указано";
  return Place[placeCode as keyof typeof Place] ?? placeCode;
};

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
  const [step, setStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { draft, saveDraft, clearMovements, isRestored, markRestored } =
    useDraftStore();

  const initialValues = isRestored
    ? { ...defaultFormValues, ...draft }
    : defaultFormValues;

  const methods = useForm<DayMovementsFormValues>({
    resolver: zodResolver(dayMovementsSchema),
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
        (currDepartureAddress?.value ?? "") !== (nextDepartureAddress?.value ?? "")
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
          setSubmitError(err.message || "Ошибка при отправке формы.");
        } else {
          setSubmitError("Произошла ошибка при отправке формы.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [clearMovements],
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
    movementSchema.safeParse(movement).success
  );
  const canAddMovement =
    isMovementsDateSet && fields.length < 15 && allMovementsComplete;
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
            <Stepper.Step label="Общая информация" />
            <Stepper.Step label="Передвижения" />
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
                      label="День рождения"
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
                          label="Пол"
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
                          label="Социальный статус"
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
                      onChange={(val) =>
                        {
                          field.onChange(
                            val as DayMovementsFormValues["homeAddress"],
                          );
                          void trigger("homeAddress");
                        }
                      }
                      getAddressItems={getAddressItems}
                      delay={ADDRESS_DELAY}
                      minChars={DEFAULT_MIN_CHARS}
                      label="Адрес проживания"
                      description="Начните вводить адрес, чтобы увидеть подсказки. Необходимо выбрать из списка с точностью до дома"
                      error={toError(errors.homeAddress?.message)}
                    />
                  )}
                />

                <Stack gap="xs">
                  <Text fw={600}>Расходы на транспорт, ₽/мес</Text>
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Controller
                        control={control}
                        name="transportCostMin"
                        render={({ field }) => (
                          <NumberInput
                            label="Минимум"
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
                            label="Максимум"
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
                  <Text fw={600}>Доход, ₽/мес</Text>
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Controller
                        control={control}
                        name="incomeMin"
                        render={({ field }) => (
                          <NumberInput
                            label="Минимум"
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
                            label="Максимум"
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
                  <Button onClick={goToNextStep}>Далее</Button>
                </Group>
              </>
            )}

            {step === 1 && (
              <>
                <TextInput
                  type="date"
                  label="Дата передвижений"
                  withAsterisk
                  description="Нужно будет описать передвижения за этот день"
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
                            <Text fw={600}>Отправление</Text>
                            <Grid>
                              <Grid.Col span={{ base: 12, sm: 4 }}>
                                <Controller
                                  control={control}
                                  name="movements.0.departureTime"
                                  render={({ field }) => (
                                    <TimePicker
                                      label="Время"
                                      withAsterisk
                                      value={field.value ?? ""}
                                      onChange={field.onChange}
                                      format="24h"
                                      withSeconds={false}
                                      leftSection={<IconClockHour3 size={16} />}
                                      error={toError(
                                        errors.movements?.[0]?.departureTime?.message,
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
                                      label="Пункт"
                                      withAsterisk
                                      data={enumToOptions(Place)}
                                      searchable
                                      value={field.value ?? null}
                                      onChange={field.onChange}
                                      error={toError(
                                        errors.movements?.[0]?.departurePlace?.message,
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
                                  value={field.value as DaDataAddressSuggestion | null}
                                  onChange={field.onChange}
                                  getAddressItems={getAddressItems}
                                  delay={ADDRESS_DELAY}
                                  minChars={DEFAULT_MIN_CHARS}
                                  disabled={startDeparturePlace === "HOME_RESIDENCE"}
                                  label="Адрес"
                                  withAsterisk
                                  description={
                                    startDeparturePlace === "HOME_RESIDENCE"
                                      ? "Адрес подставлен из адреса проживания"
                                      : "Начните вводить адрес, чтобы увидеть подсказки. Необходимо выбрать из списка с точностью до дома"
                                  }
                                  error={toError(
                                    errors.movements?.[0]?.departureAddress?.message,
                                  )}
                                />
                              )}
                            />
                          </Stack>
                        </Card>
                      </Timeline.Item>

                      {isFirstDepartureReady &&
                        fields.flatMap((field, index) => {
                          const previousPlaceLabel =
                            index === 0
                              ? getPlaceLabel(timelineStartPoint.departurePlace)
                              : getPlaceLabel(movements?.[index - 1]?.arrivalPlace);
                          const previousAddressLabel =
                            index === 0
                              ? (timelineStartPoint.departureAddress?.value ?? null)
                              : (movements?.[index - 1]?.arrivalAddress?.value ?? null);

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
                      <Button variant="light" onClick={addMovementIfPreviousValid}>
                        Добавить передвижение
                      </Button>
                    )}
                  </>
                )}

                {submitError && <Alert color="red">{submitError}</Alert>}

                <Group justify="space-between">
                  <Button variant="default" onClick={goToPreviousStep}>
                    Назад
                  </Button>
                  <Button type="submit" loading={isSubmitting}>
                    Завершить
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
