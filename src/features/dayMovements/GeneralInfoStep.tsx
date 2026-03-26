import { Button, Grid, Group, NumberInput, Select, Stack, Text, TextInput } from "@mantine/core";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AddressAutocomplete } from "../../components/ui/AddressAutocomplete.tsx";
import type { DaDataAddressSuggestion } from "./addressUtils.ts";
import type { DayMovementsFormValues } from "./schema.ts";
import type { SelectOption } from "./types.ts";

interface GeneralInfoStepProps {
  genderOptions: SelectOption[];
  socialStatusOptions: SelectOption[];
  getAddressItems: (query: string) => Promise<DaDataAddressSuggestion[]>;
  addressDelay: number;
  addressMinChars: number;
  onNext: () => void;
}

const toError = (message: unknown) => (typeof message === "string" ? message : undefined);

export function GeneralInfoStep({
  genderOptions,
  socialStatusOptions,
  getAddressItems,
  addressDelay,
  addressMinChars,
  onNext,
}: GeneralInfoStepProps) {
  const { t } = useTranslation();
  const {
    register,
    trigger,
    control,
    formState: { errors },
  } = useFormContext<DayMovementsFormValues>();

  return (
    <>
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 4 }}>
          <TextInput
            data-testid="birthday-input"
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
                data-testid="gender-select"
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
                data-testid="social-status-select"
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
            testId="home-address-input"
            value={field.value as DaDataAddressSuggestion | null}
            onChange={(val) => {
              field.onChange(val as DayMovementsFormValues["homeAddress"]);
              void trigger("homeAddress");
            }}
            getAddressItems={getAddressItems}
            delay={addressDelay}
            minChars={addressMinChars}
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
                  data-testid="transport-cost-min-input"
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
                  data-testid="transport-cost-max-input"
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
                  data-testid="income-min-input"
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
                  data-testid="income-max-input"
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
        <Button data-testid="next-step-btn" onClick={onNext}>
          {t("common.next")}
        </Button>
      </Group>
    </>
  );
}
