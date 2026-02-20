import { useEffect } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import {
  alpha,
  Button,
  Card,
  Group,
  MultiSelect,
  NumberInput,
  Radio,
  Stack,
  Text,
  useComputedColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { IconBus, IconWalk } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { enumToOptions, Transport, TypeMovement } from "./enums.ts";
import type { DayMovementsFormValues } from "./schema.ts";

interface MovementItemProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  previousPlaceLabel: string;
  previousAddressLabel: string | null;
  disabled?: boolean;
}

const toError = (message: unknown) =>
  typeof message === "string" ? message : undefined;

export function MovementItem({
  index,
  onRemove,
  canRemove,
  previousPlaceLabel,
  previousAddressLabel,
  disabled = false,
}: MovementItemProps) {
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const isDark = colorScheme === "dark";

  const selectedBorderColor = isDark
    ? theme.colors.blue[4]
    : theme.colors.blue[6];
  const selectedBackground = isDark
    ? alpha(theme.colors.blue[7], 0.35)
    : alpha(theme.colors.blue[1], 0.9);

  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<DayMovementsFormValues>();

  const prefix = `movements.${index}` as const;
  const movementErrors = errors.movements?.[index];

  const movementType = useWatch({ control, name: `${prefix}.movementType` });
  const transports: string[] =
    useWatch({ control, name: `${prefix}.transport` }) ?? [];

  const isTransport = movementType === "TRANSPORT";
  const showPeopleInCar = transports.includes("CAR_SHARING") ||
    transports.includes("PRIVATE_CAR");
  const transportOptions = enumToOptions(Transport, t, "enums.transport");

  useEffect(() => {
    if (!movementType) {
      setValue(`${prefix}.movementType`, "ON_FOOT", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }
  }, [movementType, prefix, setValue]);

  return (
    <Card withBorder radius="md" p="lg" shadow="xs">
      <Stack gap="md">
        <GroupHeader
          title={t("movement.title", { index: index + 1 })}
          removeLabel={t("movement.remove")}
          canRemove={canRemove && !disabled}
          onRemove={onRemove}
        />

        <Stack gap={2}>
          <Text size="sm" c="dimmed">
            {t("movement.from")}
          </Text>
          <Text size="sm" fw={500}>
            {previousPlaceLabel}
          </Text>
          {previousAddressLabel && (
            <Text size="xs" c="dimmed">
              {previousAddressLabel}
            </Text>
          )}
        </Stack>

        <Controller
          control={control}
          name={`${prefix}.movementType`}
          render={({ field }) => (
            <Stack gap={6}>
              {(() => {
                const selectedValue = field.value ?? "ON_FOOT";
                return (
                  <Radio.Group
                    name={field.name}
                    value={selectedValue}
                    onChange={field.onChange}
                    readOnly={disabled}
                  >
                    <Group justify="center" grow>
                      <Radio.Card
                        value="ON_FOOT"
                        radius="md"
                        withBorder
                        p="md"
                        style={{
                          cursor: disabled ? "not-allowed" : "pointer",
                          opacity: disabled ? 0.7 : 1,
                          borderColor: selectedValue === "ON_FOOT"
                            ? selectedBorderColor
                            : undefined,
                          background: selectedValue === "ON_FOOT"
                            ? selectedBackground
                            : undefined,
                        }}
                      >
                        <Stack align="center" gap={6}>
                          <IconWalk size={18} />
                          <Text size="sm">
                            {t(`enums.typeMovement.${TypeMovement.ON_FOOT}`)}
                          </Text>
                        </Stack>
                      </Radio.Card>
                      <Radio.Card
                        value="TRANSPORT"
                        radius="md"
                        withBorder
                        p="md"
                        style={{
                          cursor: disabled ? "not-allowed" : "pointer",
                          opacity: disabled ? 0.7 : 1,
                          borderColor: selectedValue === "TRANSPORT"
                            ? selectedBorderColor
                            : undefined,
                          background: selectedValue === "TRANSPORT"
                            ? selectedBackground
                            : undefined,
                        }}
                      >
                        <Stack align="center" gap={6}>
                          <IconBus size={18} />
                          <Text size="sm">
                            {t(`enums.typeMovement.${TypeMovement.TRANSPORT}`)}
                          </Text>
                        </Stack>
                      </Radio.Card>
                    </Group>
                  </Radio.Group>
                );
              })()}
              {toError(movementErrors?.movementType?.message) && (
                <Text size="xs" c="red">
                  {toError(movementErrors?.movementType?.message)}
                </Text>
              )}
            </Stack>
          )}
        />

        {isTransport && (
          <Controller
            control={control}
            name={`${prefix}.transport`}
            render={({ field }) => (
              <MultiSelect
                label={t("movement.transportType")}
                data={transportOptions}
                value={field.value ?? []}
                onChange={field.onChange}
                searchable
                disabled={disabled}
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
                label={t("movement.peopleInCar")}
                min={1}
                max={15}
                value={field.value ?? undefined}
                onChange={field.onChange}
                disabled={disabled}
                error={toError(movementErrors?.numberPeopleInCar?.message)}
              />
            )}
          />
        )}

        {isTransport && (
          <Stack gap="md">
            <Text fw={600}>{t("movement.transportParams")}</Text>
            <Controller
              control={control}
              name={`${prefix}.walkToStartMinutes`}
              render={({ field }) => (
                <NumberInput
                  label={t("movement.walkToStart")}
                  min={0}
                  max={180}
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  disabled={disabled}
                  error={toError(movementErrors?.walkToStartMinutes?.message)}
                />
              )}
            />
            <Controller
              control={control}
              name={`${prefix}.waitAtStartMinutes`}
              render={({ field }) => (
                <NumberInput
                  label={t("movement.waitAtStart")}
                  min={0}
                  max={180}
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  disabled={disabled}
                  error={toError(movementErrors?.waitAtStartMinutes?.message)}
                />
              )}
            />
            <Controller
              control={control}
              name={`${prefix}.numberOfTransfers`}
              render={({ field }) => (
                <NumberInput
                  label={t("movement.transfersCount")}
                  min={0}
                  max={15}
                  value={field.value ?? 0}
                  onChange={field.onChange}
                  disabled={disabled}
                  error={toError(movementErrors?.numberOfTransfers?.message)}
                />
              )}
            />
            <Controller
              control={control}
              name={`${prefix}.waitBetweenTransfersMinutes`}
              render={({ field }) => (
                <NumberInput
                  label={t("movement.waitBetweenTransfers")}
                  min={0}
                  max={180}
                  value={field.value ?? 0}
                  onChange={field.onChange}
                  disabled={disabled}
                  error={toError(
                    movementErrors?.waitBetweenTransfersMinutes?.message,
                  )}
                />
              )}
            />
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

interface GroupHeaderProps {
  title: string;
  removeLabel: string;
  canRemove: boolean;
  onRemove: () => void;
}

function GroupHeader(
  { title, removeLabel, canRemove, onRemove }: GroupHeaderProps,
) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text fw={600}>{title}</Text>
      {canRemove && (
        <Button
          variant="subtle"
          color="red"
          size="compact-sm"
          onClick={onRemove}
        >
          {removeLabel}
        </Button>
      )}
    </div>
  );
}
