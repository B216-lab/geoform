import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App.tsx";
import {
  extractRespondentKeyFromUrl,
  validateRespondentKey,
} from "../features/dayMovements/formSubmission.ts";
import i18n from "../lib/i18n.ts";

vi.mock("../features/dayMovements/DayMovementsForm.tsx", () => ({
  DayMovementsForm: ({ respondentKey }: { respondentKey?: string | null }) => (
    <div data-testid="day-movements-form">{respondentKey ?? "anonymous"}</div>
  ),
}));

vi.mock("../features/dayMovements/formSubmission.ts", async () => {
  const actual = await vi.importActual<typeof import("../features/dayMovements/formSubmission.ts")>(
    "../features/dayMovements/formSubmission.ts",
  );

  return {
    ...actual,
    validateRespondentKey: vi.fn(),
  };
});

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <MantineProvider env="test">{children}</MantineProvider>
    </I18nextProvider>
  );
}

describe("App access flow", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    vi.mocked(validateRespondentKey).mockReset();
  });

  it("allows opening the form without respondent key", async () => {
    render(
      <Wrapper>
        <App />
      </Wrapper>,
    );

    await waitFor(() => expect(screen.getByTestId("day-movements-form")).toBeInTheDocument());
    expect(screen.getByTestId("day-movements-form")).toHaveTextContent("anonymous");
    expect(extractRespondentKeyFromUrl(window.location.href)).toBeNull();
    expect(validateRespondentKey).not.toHaveBeenCalled();
  });

  it("shows invalid access error only when provided key is invalid", async () => {
    window.history.replaceState({}, "", "/?respondentKey=bad-key");
    vi.mocked(validateRespondentKey).mockResolvedValue(false);

    render(
      <Wrapper>
        <App />
      </Wrapper>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("respondent-key-invalid-alert")).toBeInTheDocument(),
    );
    expect(validateRespondentKey).toHaveBeenCalledWith("bad-key");
  });
});
