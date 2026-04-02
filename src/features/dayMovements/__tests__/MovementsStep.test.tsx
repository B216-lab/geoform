import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import i18n from "../../../lib/i18n.ts";
import { MovementsStep } from "../MovementsStep.tsx";
import type { DayMovementsFormValues } from "../schema.ts";
import type {
  AddressConfig,
  MovementsStepActions,
  MovementsStepStatus,
  MovementsStepTimeline,
} from "../types.ts";

function Wrapper({ children }: { children: ReactNode }) {
  const methods = useForm<DayMovementsFormValues>({
    defaultValues: {
      birthday: "1990-01-01",
      gender: "MALE",
      socialStatus: "WORKING",
      homeAddress: undefined,
      transportCostMin: 0,
      transportCostMax: 3000,
      incomeMin: 0,
      incomeMax: 50000,
      movementsDate: "2026-01-15",
      movements: [
        {
          movementType: "ON_FOOT",
          transport: [],
          waitBetweenTransfersMinutes: 0,
          departureTime: "08:00",
          departurePlace: "HOME_RESIDENCE",
          departureAddress: null,
          arrivalTime: "",
          arrivalPlace: "",
          arrivalAddress: null,
          comment: "",
        },
      ],
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

function makeTimeline(overrides: Partial<MovementsStepTimeline> = {}): MovementsStepTimeline {
  return {
    movementsDateMax: "2026-03-19",
    isMovementsDateSet: true,
    fields: [{ id: "field-1" }] as MovementsStepTimeline["fields"],
    movements: [
      {
        movementType: "ON_FOOT",
        transport: [],
        waitBetweenTransfersMinutes: 0,
        departureTime: "08:00",
        departurePlace: "HOME_RESIDENCE",
        departureAddress: null,
        arrivalTime: "",
        arrivalPlace: "",
        arrivalAddress: null,
        comment: "",
      },
    ],
    chainedMovements: [],
    timelineStartPoint: { departurePlace: "HOME_RESIDENCE", departureAddress: null },
    isFirstDepartureReady: false,
    canAddMovement: false,
    startDeparturePlace: "HOME_RESIDENCE",
    homeAddress: null,
    ...overrides,
  };
}

function makeAddressConfig(): AddressConfig {
  return {
    getAddressItems: vi.fn().mockResolvedValue([]),
    delay: 1000,
    minChars: 3,
  };
}

function makeActions(overrides: Partial<MovementsStepActions> = {}): MovementsStepActions {
  return {
    onAddMovement: vi.fn(),
    onRemoveMovement: vi.fn(),
    onBack: vi.fn(),
    getPlaceLabel: (code) => code ?? "Unspecified",
    isMovementLegReady: () => false,
    ...overrides,
  };
}

function makeStatus(overrides: Partial<MovementsStepStatus> = {}): MovementsStepStatus {
  return {
    movementsError: undefined,
    submitError: null,
    isSubmitting: false,
    ...overrides,
  };
}

describe("MovementsStep", () => {
  it("renders movements date input", () => {
    render(
      <Wrapper>
        <MovementsStep
          placeOptions={[{ value: "HOME_RESIDENCE", label: "Home" }]}
          timeline={makeTimeline()}
          addressConfig={makeAddressConfig()}
          actions={makeActions()}
          status={makeStatus()}
        />
      </Wrapper>,
    );

    expect(screen.getByTestId("movements-date-input")).toBeInTheDocument();
  });

  it("renders movementsError alert when provided", () => {
    render(
      <Wrapper>
        <MovementsStep
          placeOptions={[{ value: "HOME_RESIDENCE", label: "Home" }]}
          timeline={makeTimeline()}
          addressConfig={makeAddressConfig()}
          actions={makeActions()}
          status={makeStatus({ movementsError: "Test movements error" })}
        />
      </Wrapper>,
    );

    const alert = screen.getByTestId("movements-error-alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Test movements error");
  });

  it("renders submitError alert when provided", () => {
    render(
      <Wrapper>
        <MovementsStep
          placeOptions={[{ value: "HOME_RESIDENCE", label: "Home" }]}
          timeline={makeTimeline()}
          addressConfig={makeAddressConfig()}
          actions={makeActions()}
          status={makeStatus({ submitError: "Submission failed" })}
        />
      </Wrapper>,
    );

    const alert = screen.getByTestId("submit-error-alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Submission failed");
  });

  it("calls onBack when Back button is clicked", async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <MovementsStep
          placeOptions={[{ value: "HOME_RESIDENCE", label: "Home" }]}
          timeline={makeTimeline()}
          addressConfig={makeAddressConfig()}
          actions={makeActions({ onBack })}
          status={makeStatus()}
        />
      </Wrapper>,
    );

    await user.click(screen.getByTestId("back-step-btn"));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows Add Movement button when canAddMovement and isFirstDepartureReady are true", () => {
    render(
      <Wrapper>
        <MovementsStep
          placeOptions={[{ value: "HOME_RESIDENCE", label: "Home" }]}
          timeline={makeTimeline({ canAddMovement: true, isFirstDepartureReady: true })}
          addressConfig={makeAddressConfig()}
          actions={makeActions()}
          status={makeStatus()}
        />
      </Wrapper>,
    );

    expect(screen.getByTestId("add-movement-btn")).toBeInTheDocument();
  });

  it("hides Add Movement button when canAddMovement is false", () => {
    render(
      <Wrapper>
        <MovementsStep
          placeOptions={[{ value: "HOME_RESIDENCE", label: "Home" }]}
          timeline={makeTimeline({ canAddMovement: false, isFirstDepartureReady: true })}
          addressConfig={makeAddressConfig()}
          actions={makeActions()}
          status={makeStatus()}
        />
      </Wrapper>,
    );

    expect(screen.queryByTestId("add-movement-btn")).not.toBeInTheDocument();
  });

  it("calls onAddMovement when Add Movement button is clicked", async () => {
    const onAddMovement = vi.fn();
    const user = userEvent.setup();

    render(
      <Wrapper>
        <MovementsStep
          placeOptions={[{ value: "HOME_RESIDENCE", label: "Home" }]}
          timeline={makeTimeline({ canAddMovement: true, isFirstDepartureReady: true })}
          addressConfig={makeAddressConfig()}
          actions={makeActions({ onAddMovement })}
          status={makeStatus()}
        />
      </Wrapper>,
    );

    await user.click(screen.getByTestId("add-movement-btn"));

    expect(onAddMovement).toHaveBeenCalledTimes(1);
  });

  it("renders editable departure time for movements after the first", () => {
    render(
      <Wrapper>
        <MovementsStep
          placeOptions={[{ value: "HOME_RESIDENCE", label: "Home" }]}
          timeline={makeTimeline({
            fields: [{ id: "field-1" }, { id: "field-2" }] as MovementsStepTimeline["fields"],
            isFirstDepartureReady: true,
            movements: [
              {
                movementType: "ON_FOOT",
                transport: [],
                waitBetweenTransfersMinutes: 0,
                departureTime: "08:00",
                departurePlace: "HOME_RESIDENCE",
                departureAddress: null,
                arrivalTime: "08:30",
                arrivalPlace: "WORKPLACE",
                arrivalAddress: {
                  value: "ул. Карла Маркса, д. 5",
                  data: { house: "5" },
                },
                comment: "",
              },
              {
                movementType: "ON_FOOT",
                transport: [],
                waitBetweenTransfersMinutes: 0,
                departureTime: "09:00",
                departurePlace: "WORKPLACE",
                departureAddress: {
                  value: "ул. Карла Маркса, д. 5",
                  data: { house: "5" },
                },
                arrivalTime: "",
                arrivalPlace: "",
                arrivalAddress: null,
                comment: "",
              },
            ],
            chainedMovements: [
              {
                movementType: "ON_FOOT",
                transport: [],
                waitBetweenTransfersMinutes: 0,
                departureTime: "08:00",
                departurePlace: "HOME_RESIDENCE",
                departureAddress: null,
                arrivalTime: "08:30",
                arrivalPlace: "WORKPLACE",
                arrivalAddress: {
                  value: "ул. Карла Маркса, д. 5",
                  data: { house: "5" },
                },
                comment: "",
              },
              {
                movementType: "ON_FOOT",
                transport: [],
                waitBetweenTransfersMinutes: 0,
                departureTime: "09:00",
                departurePlace: "WORKPLACE",
                departureAddress: {
                  value: "ул. Карла Маркса, д. 5",
                  data: { house: "5" },
                },
                arrivalTime: "",
                arrivalPlace: "",
                arrivalAddress: null,
                comment: "",
              },
            ],
          })}
          addressConfig={makeAddressConfig()}
          actions={makeActions({
            isMovementLegReady: (movement) => Boolean(movement?.arrivalPlace),
          })}
          status={makeStatus()}
        />
      </Wrapper>,
    );

    expect(screen.getByTestId("movement-1-departure-time")).toBeInTheDocument();
  });
});
