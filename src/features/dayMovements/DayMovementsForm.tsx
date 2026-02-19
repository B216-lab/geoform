import { useState, useEffect, useCallback } from "react";
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
  TextInput,
} from "@mantine/core";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { MovementItem } from "./MovementItem";
import { SuccessScreen } from "@/components/SuccessScreen";
import {
  dayMovementsSchema,
  defaultFormValues,
  defaultMovement,
  type DayMovementsFormValues,
  type MovementValues,
} from "./schema";
import { enumToOptions, Gender, SocialStatus } from "./enums";
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

export function DayMovementsForm() {
  const [step, setStep] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addMovementError, setAddMovementError] = useState<string | null>(null);

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
  useEffect(() => {
    if (!movements || movements.length < 2) return;
    for (let i = 1; i < movements.length; i++) {
      const prev = movements[i - 1];
      if (!prev) continue;

      const prevArrivalPlace = prev.arrivalPlace ?? "";
      const prevArrivalAddress = prev.arrivalAddress ?? null;
      const curr = movements[i];

      if (curr?.departurePlace !== prevArrivalPlace) {
        setValue(`movements.${i}.departurePlace` as const, prevArrivalPlace);
      }
      if (curr?.departureAddress !== prevArrivalAddress) {
        setValue(`movements.${i}.departureAddress` as const, prevArrivalAddress);
      }
    }
  }, [
    movements?.length,
    ...((movements ?? []).map((m) => m?.arrivalPlace) ?? []),
    ...((movements ?? []).map((m) => m?.arrivalAddress) ?? []),
    setValue,
  ]);

  const goToNextStep = useCallback(async () => {
    const valid = await trigger(
      PAGE0_FIELDS as unknown as (keyof DayMovementsFormValues)[],
    );
    if (valid) setStep(1);
  }, [trigger]);

  const goToPreviousStep = useCallback(() => setStep(0), []);

  const addMovementIfPreviousValid = useCallback(async () => {
    const lastIndex = fields.length - 1;
    if (lastIndex < 0) return;

    const isLastMovementValid = await trigger(
      `movements.${lastIndex}` as unknown as keyof DayMovementsFormValues,
    );

    if (!isLastMovementValid) {
      setAddMovementError(
        "Заполните и исправьте текущее передвижение перед добавлением следующего.",
      );
      return;
    }

    setAddMovementError(null);
    append({ ...defaultMovement } as MovementValues);
  }, [append, fields.length, trigger]);

  const onSubmit = useCallback(
    async (data: DayMovementsFormValues) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await submitDayMovementsForm(data);
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
                      {...register("birthday")}
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
                          onChange={field.onChange}
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
                          onChange={field.onChange}
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
                        field.onChange(
                          val as DayMovementsFormValues["homeAddress"],
                        )
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
                <Alert title="Важно" color="blue" variant="light">
                  Необходимо внести данные о всех передвижениях за выбранный день{" "}
                  {movementsDate && <b>{movementsDate}</b>} и обязательно учитывать
                  передвижения в пешей доступности.
                </Alert>

                <TextInput
                  type="date"
                  label="Дата передвижений"
                  description="Нужно будет описать передвижения за этот день"
                  error={toError(errors.movementsDate?.message)}
                  {...register("movementsDate")}
                />

                <Text fw={600}>Передвижения</Text>
                {fields.map((field, index) => (
                  <MovementItem
                    key={field.id}
                    index={index}
                    onRemove={() => remove(index)}
                    canRemove={fields.length > 1}
                    getAddressItems={getAddressItems}
                    addressDelay={ADDRESS_DELAY}
                    addressMinChars={DEFAULT_MIN_CHARS}
                  />
                ))}

                {fields.length < 15 && (
                  <Button
                    variant="light"
                    onClick={addMovementIfPreviousValid}
                  >
                    Добавить передвижение
                  </Button>
                )}

                {addMovementError && <Alert color="orange">{addMovementError}</Alert>}

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
