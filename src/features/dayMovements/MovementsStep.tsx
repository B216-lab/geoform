import {
  Alert,
  Button,
  Card,
  Grid,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Timeline,
} from "@mantine/core";
import { TimePicker } from "@mantine/dates";
import { IconClockHour3, IconMapPin } from "@tabler/icons-react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AddressAutocomplete } from "../../components/ui/AddressAutocomplete.tsx";
import { ArrivalPointItem } from "./ArrivalPointItem.tsx";
import type { DaDataAddressSuggestion } from "./addressUtils.ts";
import { MovementItem } from "./MovementItem.tsx";
import type { DayMovementsFormValues } from "./schema.ts";
import type {
  AddressConfig,
  MovementsStepActions,
  MovementsStepStatus,
  MovementsStepTimeline,
  SelectOption,
} from "./types.ts";

interface MovementsStepProps {
  placeOptions: SelectOption[];
  timeline: MovementsStepTimeline;
  addressConfig: AddressConfig;
  actions: MovementsStepActions;
  status: MovementsStepStatus;
}

const toError = (message: unknown) => (typeof message === "string" ? message : undefined);

export function MovementsStep({
  placeOptions,
  timeline,
  addressConfig,
  actions,
  status,
}: MovementsStepProps) {
  const { t } = useTranslation();
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<DayMovementsFormValues>();

  const {
    movementsDateMax,
    isMovementsDateSet,
    fields,
    movements,
    chainedMovements,
    timelineStartPoint,
    isFirstDepartureReady,
    canAddMovement,
    startDeparturePlace,
    homeAddress,
  } = timeline;

  const { getAddressItems, delay: addressDelay, minChars: addressMinChars } = addressConfig;

  const { onAddMovement, onRemoveMovement, onBack, getPlaceLabel, isMovementLegReady } = actions;

  const { movementsError, submitError, isSubmitting } = status;

  return (
    <>
      <TextInput
        data-testid="movements-date-input"
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
          <Timeline bulletSize={24} lineWidth={2} active={Math.max(fields.length, 0)}>
            <Timeline.Item bullet={<IconMapPin size={12} />}>
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
                            data-testid="movement-0-departure-time"
                            label={t("form.time")}
                            withAsterisk
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            format="24h"
                            withSeconds={false}
                            leftSection={<IconClockHour3 size={16} />}
                            error={toError(errors.movements?.[0]?.departureTime?.message)}
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
                            data-testid="movement-0-departure-place"
                            label={t("form.point")}
                            withAsterisk
                            data={placeOptions}
                            searchable
                            value={field.value ?? null}
                            onChange={field.onChange}
                            error={toError(errors.movements?.[0]?.departurePlace?.message)}
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
                        testId="movement-0-departure-address"
                        value={field.value as DaDataAddressSuggestion | null}
                        onChange={field.onChange}
                        getAddressItems={getAddressItems}
                        delay={addressDelay}
                        minChars={addressMinChars}
                        disabled={startDeparturePlace === "HOME_RESIDENCE"}
                        label={t("form.address")}
                        withAsterisk
                        description={
                          startDeparturePlace === "HOME_RESIDENCE"
                            ? t("form.homeAddressAutofill")
                            : t("form.homeAddressDescription")
                        }
                        error={toError(errors.movements?.[0]?.departureAddress?.message)}
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
                      onRemove={() => onRemoveMovement(index)}
                      canRemove={fields.length > 1}
                      previousPlaceLabel={previousPlaceLabel}
                      previousAddressLabel={previousAddressLabel}
                    />
                  </Timeline.Item>,
                ];

                if (isMovementLegReady(chainedMovements[index])) {
                  items.push(
                    <Timeline.Item key={`${field.id}-arrival`} bullet={<IconMapPin size={12} />}>
                      <ArrivalPointItem
                        index={index}
                        homeAddress={homeAddress ?? null}
                        getAddressItems={getAddressItems}
                        addressDelay={addressDelay}
                        addressMinChars={addressMinChars}
                      />
                    </Timeline.Item>,
                  );
                }

                return items;
              })}
          </Timeline>

          {isFirstDepartureReady && canAddMovement && (
            <Button data-testid="add-movement-btn" variant="light" onClick={onAddMovement}>
              {t("form.addMovement")}
            </Button>
          )}
        </>
      )}

      {movementsError && (
        <Alert data-testid="movements-error-alert" color="red">
          {movementsError}
        </Alert>
      )}

      {submitError && (
        <Alert data-testid="submit-error-alert" color="red">
          {submitError}
        </Alert>
      )}

      <Group justify="space-between">
        <Button data-testid="back-step-btn" type="button" variant="default" onClick={onBack}>
          {t("common.back")}
        </Button>
        <Button data-testid="submit-btn" type="submit" loading={isSubmitting}>
          {t("common.finish")}
        </Button>
      </Group>
    </>
  );
}
