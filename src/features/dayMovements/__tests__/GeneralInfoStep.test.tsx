import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import i18n from "../../../lib/i18n.ts";
import { GeneralInfoStep } from "../GeneralInfoStep.tsx";
import type { DayMovementsFormValues } from "../schema.ts";

function Wrapper({ children }: { children: ReactNode }) {
  const methods = useForm<DayMovementsFormValues>({
    defaultValues: {
      birthday: "",
      gender: undefined,
      socialStatus: undefined,
      homeAddress: undefined,
      transportCostMin: 0,
      transportCostMax: 3000,
      incomeMin: 0,
      incomeMax: 50000,
      movementsDate: "",
      movements: [],
    },
  });
  return (
    <I18nextProvider i18n={i18n}>
      <MantineProvider env="test">
        <FormProvider {...methods}>{children}</FormProvider>
      </MantineProvider>
    </I18nextProvider>
  );
}

const mockGetAddressItems = vi.fn().mockResolvedValue([]);

describe("GeneralInfoStep", () => {
  it("renders the Next button", () => {
    render(
      <Wrapper>
        <GeneralInfoStep
          genderOptions={[{ value: "MALE", label: "Male" }]}
          socialStatusOptions={[{ value: "WORKING", label: "Working" }]}
          getAddressItems={mockGetAddressItems}
          addressDelay={1000}
          addressMinChars={3}
          onNext={vi.fn()}
        />
      </Wrapper>,
    );

    expect(screen.getByTestId("next-step-btn")).toBeInTheDocument();
  });

  it("calls onNext when the Next button is clicked", async () => {
    const onNext = vi.fn();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <GeneralInfoStep
          genderOptions={[{ value: "MALE", label: "Male" }]}
          socialStatusOptions={[{ value: "WORKING", label: "Working" }]}
          getAddressItems={mockGetAddressItems}
          addressDelay={1000}
          addressMinChars={3}
          onNext={onNext}
        />
      </Wrapper>,
    );

    await user.click(screen.getByTestId("next-step-btn"));

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("renders birthday, gender, and social status fields", () => {
    render(
      <Wrapper>
        <GeneralInfoStep
          genderOptions={[{ value: "MALE", label: "Male" }]}
          socialStatusOptions={[{ value: "WORKING", label: "Working" }]}
          getAddressItems={mockGetAddressItems}
          addressDelay={1000}
          addressMinChars={3}
          onNext={vi.fn()}
        />
      </Wrapper>,
    );

    expect(screen.getByTestId("birthday-input")).toBeInTheDocument();
    expect(screen.getByTestId("gender-select")).toBeInTheDocument();
    expect(screen.getByTestId("social-status-select")).toBeInTheDocument();
  });
});
