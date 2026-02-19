import { useEffect, useRef } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Card, Grid, NumberInput, Select, Stack, Text, Textarea } from "@mantine/core";
import { TimePicker } from "@mantine/dates";
import { IconClockHour3 } from "@tabler/icons-react";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { enumToOptions, Place } from "./enums";
import type { DaDataAddressSuggestion } from "./addressUtils";
import type { DayMovementsFormValues } from "./schema";

interface ArrivalPointItemProps {
  index: number;
  disabled?: boolean;
  homeAddress: DaDataAddressSuggestion | null;
  getAddressItems: (query: string) => Promise<DaDataAddressSuggestion[]>;
  addressDelay: number;
  addressMinChars: number;
}

const placeOptions = enumToOptions(Place);
const toError = (message: unknown) =>
  typeof message === "string" ? message : undefined;

export function ArrivalPointItem({
  index,
  disabled = false,
  homeAddress,
  getAddressItems,
  addressDelay,
  addressMinChars,
}: ArrivalPointItemProps) {
  const {
    register,
    control,
    setValue,
    clearErrors,
    formState: { errors },
  } = useFormContext<DayMovementsFormValues>();

  const prefix = `movements.${index}` as const;
  const movementErrors = errors.movements?.[index];

  const movementType = useWatch({ control, name: `${prefix}.movementType` });
  const arrivalPlace = useWatch({ control, name: `${prefix}.arrivalPlace` });
  const arrivalAddress = useWatch({
    control,
    name: `${prefix}.arrivalAddress`,
  }) as DaDataAddressSuggestion | null | undefined;
  const previousArrivalPlaceRef = useRef<string | undefined>(arrivalPlace);

  const isTransport = movementType === "TRANSPORT";

  useEffect(() => {
    if (
      arrivalPlace === "HOME_RESIDENCE" &&
      homeAddress &&
      (arrivalAddress?.value ?? "") !== homeAddress.value
    ) {
      setValue(`${prefix}.arrivalAddress`, homeAddress, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
      clearErrors(`${prefix}.arrivalAddress`);
    }

    if (
      previousArrivalPlaceRef.current === "HOME_RESIDENCE" &&
      arrivalPlace !== "HOME_RESIDENCE" &&
      arrivalAddress
    ) {
      setValue(`${prefix}.arrivalAddress`, null, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }

    previousArrivalPlaceRef.current = arrivalPlace;
  }, [
    arrivalPlace,
    homeAddress,
    arrivalAddress?.value,
    prefix,
    setValue,
    clearErrors,
  ]);

  return (
    <Card withBorder radius="md" p="lg" shadow="xs">
      <Stack gap="md">
        <Text fw={600}>Точка маршрута {index + 1}</Text>

        <Grid>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Controller
              control={control}
              name={`${prefix}.arrivalTime`}
              render={({ field }) => (
                <TimePicker
                  label="Время"
                  withAsterisk
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  format="24h"
                  withSeconds={false}
                  leftSection={<IconClockHour3 size={16} />}
                  error={toError(movementErrors?.arrivalTime?.message)}
                  disabled={disabled}
                />
              )}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 8 }}>
            <Controller
              control={control}
              name={`${prefix}.arrivalPlace`}
              render={({ field }) => (
                <Select
                  label="Пункт"
                  withAsterisk
                  data={placeOptions}
                  searchable
                  value={field.value ?? null}
                  onChange={field.onChange}
                  disabled={disabled}
                  error={toError(movementErrors?.arrivalPlace?.message)}
                />
              )}
            />
          </Grid.Col>
        </Grid>
        <Controller
          control={control}
          name={`${prefix}.arrivalAddress`}
          render={({ field }) => (
            <AddressAutocomplete
              value={field.value ?? null}
              onChange={field.onChange}
              getAddressItems={getAddressItems}
              delay={addressDelay}
              minChars={addressMinChars}
              disabled={disabled || arrivalPlace === "HOME_RESIDENCE"}
              label="Адрес"
              withAsterisk
              description={arrivalPlace === "HOME_RESIDENCE"
                ? "Адрес подставлен из адреса проживания"
                : "Начните вводить адрес, чтобы увидеть подсказки. Необходимо выбрать из списка с точностью до дома"}
              error={arrivalPlace === "HOME_RESIDENCE"
                ? undefined
                : toError(movementErrors?.arrivalAddress?.message)}
            />
          )}
        />

        {isTransport && (
          <Stack gap="md">
            <Controller
              control={control}
              name={`${prefix}.walkFromFinishMinutes`}
              render={({ field }) => (
                <NumberInput
                  label="Пешком от конечной остановки / парковки до места прибытия, мин"
                  min={0}
                  max={180}
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  disabled={disabled}
                  error={toError(movementErrors?.walkFromFinishMinutes?.message)}
                />
              )}
            />

            <Controller
              control={control}
              name={`${prefix}.tripCost`}
              render={({ field }) => (
                <NumberInput
                  label="Стоимость поездки / парковки, ₽"
                  min={0}
                  max={25000}
                  leftSection="₽"
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  disabled={disabled}
                  error={toError(movementErrors?.tripCost?.message)}
                />
              )}
            />
          </Stack>
        )}

        <Textarea
          label="Комментарий"
          error={toError(movementErrors?.comment?.message)}
          description="Особенности маршрута, проблемы, пожелания..."
          maxLength={2000}
          disabled={disabled}
          {...register(`${prefix}.comment`)}
        />
      </Stack>
    </Card>
  );
}
