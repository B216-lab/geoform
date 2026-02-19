import { useFormContext, useWatch, Controller } from "react-hook-form";
import {
  Button,
  Card,
  Grid,
  NumberInput,
  Radio,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  MultiSelect,
} from "@mantine/core";
import { IconClockHour3 } from "@tabler/icons-react";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { enumToOptions, TypeMovement, Transport, Place } from "./enums";
import type { DayMovementsFormValues } from "./schema";
import type { DaDataAddressSuggestion } from "./addressUtils";

interface MovementItemProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  getAddressItems: (query: string) => Promise<DaDataAddressSuggestion[]>;
  addressDelay: number;
  addressMinChars: number;
}

const placeOptions = enumToOptions(Place);
const transportOptions = enumToOptions(Transport);
const movementTypeOptions = enumToOptions(TypeMovement);

const toError = (message: unknown) =>
  typeof message === "string" ? message : undefined;

export function MovementItem({
  index,
  onRemove,
  canRemove,
  getAddressItems,
  addressDelay,
  addressMinChars,
}: MovementItemProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<DayMovementsFormValues>();

  const prefix = `movements.${index}` as const;
  const movementErrors = errors.movements?.[index];

  const movementType = useWatch({ control, name: `${prefix}.movementType` });
  const departurePlace = useWatch({ control, name: `${prefix}.departurePlace` });
  const arrivalPlace = useWatch({ control, name: `${prefix}.arrivalPlace` });
  const transports: string[] =
    useWatch({ control, name: `${prefix}.transport` }) ?? [];

  const isTransport = movementType === "TRANSPORT";
  const showDepartureAddress = departurePlace !== "HOME_RESIDENCE";
  const showArrivalAddress = arrivalPlace !== "HOME_RESIDENCE";
  const showPeopleInCar = transports.includes("CAR_SHARING");
  const isChained = index > 0;

  return (
    <Card withBorder radius="md" p="lg" shadow="xs">
      <Stack gap="md">
        <GroupHeader
          title={`Передвижение ${index + 1}`}
          canRemove={canRemove}
          onRemove={onRemove}
        />

        <Controller
          control={control}
          name={`${prefix}.movementType`}
          render={({ field }) => (
            <Radio.Group
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              label="Способ передвижения"
              error={toError(movementErrors?.movementType?.message)}
            >
              <div style={{ display: "flex", gap: 16 }}>
                {movementTypeOptions.map((opt) => (
                  <Radio key={opt.value} value={opt.value} label={opt.label} />
                ))}
              </div>
            </Radio.Group>
          )}
        />

        {isTransport && (
          <Controller
            control={control}
            name={`${prefix}.transport`}
            render={({ field }) => (
              <MultiSelect
                label="Тип транспорта"
                data={transportOptions}
                value={field.value ?? []}
                onChange={field.onChange}
                searchable
                error={toError(movementErrors?.transport?.message)}
              />
            )}
          />
        )}

        {isTransport && showPeopleInCar && (
          <Controller
            control={control}
            name={`${prefix}.numberPeopleInCar`}
            render={({ field }) => (
              <NumberInput
                label="Количество людей в автомобиле"
                min={1}
                max={15}
                value={field.value ?? undefined}
                onChange={field.onChange}
                error={toError(movementErrors?.numberPeopleInCar?.message)}
              />
            )}
          />
        )}

        {isTransport && (
          <Stack gap="md">
            <Text fw={600}>Транспортные параметры</Text>
              <Controller
                control={control}
                name={`${prefix}.walkToStartMinutes`}
                render={({ field }) => (
                  <NumberInput
                    label="Пешком до начальной остановки / парковки, мин"
                    min={0}
                    max={180}
                    value={field.value ?? undefined}
                    onChange={field.onChange}
                    error={toError(movementErrors?.walkToStartMinutes?.message)}
                  />
                )}
              />

              <Controller
                control={control}
                name={`${prefix}.waitAtStartMinutes`}
                render={({ field }) => (
                  <NumberInput
                    label="Ожидание на начальной остановке, мин"
                    min={0}
                    max={180}
                    value={field.value ?? undefined}
                    onChange={field.onChange}
                    error={toError(movementErrors?.waitAtStartMinutes?.message)}
                  />
                )}
              />

              <Controller
                control={control}
                name={`${prefix}.numberOfTransfers`}
                render={({ field }) => (
                  <NumberInput
                    label="Количество пересадок"
                    min={0}
                    max={15}
                    value={field.value ?? 0}
                    onChange={field.onChange}
                    error={toError(movementErrors?.numberOfTransfers?.message)}
                  />
                )}
              />

              <Controller
                control={control}
                name={`${prefix}.waitBetweenTransfersMinutes`}
                render={({ field }) => (
                  <NumberInput
                    label="Ожидание при пересадках, мин"
                    min={0}
                    max={180}
                    value={field.value ?? 0}
                    onChange={field.onChange}
                    error={toError(
                      movementErrors?.waitBetweenTransfersMinutes?.message,
                    )}
                  />
                )}
              />
          </Stack>
        )}

        <Stack gap="md">
          <Text fw={600}>Отправление</Text>
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                type="time"
                label="Время отправления"
                leftSection={<IconClockHour3 size={16} />}
                error={toError(movementErrors?.departureTime?.message)}
                {...register(`${prefix}.departureTime`)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Controller
                control={control}
                name={`${prefix}.departurePlace`}
                render={({ field }) => (
                  <Select
                    label="Пункт отправления"
                    data={placeOptions}
                    searchable
                    value={field.value ?? null}
                    onChange={field.onChange}
                    disabled={isChained}
                    error={toError(movementErrors?.departurePlace?.message)}
                  />
                )}
              />
            </Grid.Col>
          </Grid>

          {showDepartureAddress && departurePlace && (
            <Controller
              control={control}
              name={`${prefix}.departureAddress`}
              render={({ field }) => (
                <AddressAutocomplete
                  value={field.value ?? null}
                  onChange={field.onChange}
                  getAddressItems={getAddressItems}
                  delay={addressDelay}
                  minChars={addressMinChars}
                  disabled={isChained}
                  label="Адрес отправления"
                  description="Начните вводить адрес с точностью до дома"
                  error={toError(movementErrors?.departureAddress?.message)}
                />
              )}
            />
          )}
        </Stack>

        <Stack gap="md">
          <Text fw={600}>Прибытие</Text>
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <TextInput
                type="time"
                label="Время прибытия"
                leftSection={<IconClockHour3 size={16} />}
                error={toError(movementErrors?.arrivalTime?.message)}
                {...register(`${prefix}.arrivalTime`)}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Controller
                control={control}
                name={`${prefix}.arrivalPlace`}
                render={({ field }) => (
                  <Select
                    label="Пункт прибытия"
                    data={placeOptions}
                    searchable
                    value={field.value ?? null}
                    onChange={field.onChange}
                    error={toError(movementErrors?.arrivalPlace?.message)}
                  />
                )}
              />
            </Grid.Col>
          </Grid>

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
                    value={field.value ?? undefined}
                    onChange={field.onChange}
                    error={toError(movementErrors?.tripCost?.message)}
                  />
                )}
              />
            </Stack>
          )}

          {showArrivalAddress && arrivalPlace && (
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
                  label="Адрес прибытия"
                  description="Начните вводить адрес с точностью до дома"
                  error={toError(movementErrors?.arrivalAddress?.message)}
                />
              )}
            />
          )}
        </Stack>

        <Textarea
          label="Комментарий"
          error={toError(movementErrors?.comment?.message)}
          description="Особенности маршрута, проблемы, пожелания..."
          maxLength={2000}
          {...register(`${prefix}.comment`)}
        />
      </Stack>
    </Card>
  );
}

interface GroupHeaderProps {
  title: string;
  canRemove: boolean;
  onRemove: () => void;
}

function GroupHeader({ title, canRemove, onRemove }: GroupHeaderProps) {
  return (
    <div
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
    >
      <Text fw={600}>{title}</Text>
      {canRemove && (
        <Button variant="subtle" color="red" size="compact-sm" onClick={onRemove}>
          Удалить
        </Button>
      )}
    </div>
  );
}
