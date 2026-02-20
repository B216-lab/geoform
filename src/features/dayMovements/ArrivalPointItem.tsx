import { useEffect, useRef } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import {
  Card,
  Grid,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { TimePicker } from "@mantine/dates";
import { IconClockHour3 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { AddressAutocomplete } from "../../components/ui/AddressAutocomplete.tsx";
import { enumToOptions, Place } from "./enums.ts";
import type { DaDataAddressSuggestion } from "./addressUtils.ts";
import type { DayMovementsFormValues } from "./schema.ts";

interface ArrivalPointItemProps {
  index: number;
  disabled?: boolean;
  homeAddress: DaDataAddressSuggestion | null;
  getAddressItems: (query: string) => Promise<DaDataAddressSuggestion[]>;
  addressDelay: number;
  addressMinChars: number;
}

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
  const { t } = useTranslation();
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
  const placeOptions = enumToOptions(Place, t, "enums.place");

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
        <Text fw={600}>{t("arrival.title", { index: index + 1 })}</Text>

        <Grid>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Controller
              control={control}
              name={`${prefix}.arrivalTime`}
              render={({ field }) => (
                <TimePicker
                  label={t("form.time")}
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
                  label={t("form.point")}
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
              label={t("form.address")}
              withAsterisk
              description={arrivalPlace === "HOME_RESIDENCE"
                ? t("form.homeAddressAutofill")
                : t("form.homeAddressDescription")}
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
                  label={t("arrival.walkFromFinish")}
                  min={0}
                  max={180}
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  disabled={disabled}
                  error={toError(
                    movementErrors?.walkFromFinishMinutes?.message,
                  )}
                />
              )}
            />

            <Controller
              control={control}
              name={`${prefix}.tripCost`}
              render={({ field }) => (
                <NumberInput
                  label={t("arrival.tripCost")}
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
          label={t("arrival.comment")}
          error={toError(movementErrors?.comment?.message)}
          description={t("arrival.commentDescription")}
          maxLength={2000}
          disabled={disabled}
          {...register(`${prefix}.comment`)}
        />
      </Stack>
    </Card>
  );
}
