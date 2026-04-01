import { ApiHttpError, ApiNetworkError } from "../../lib/api.ts";
import i18n from "../../lib/i18n.ts";
import { getApiBaseUrl } from "../../lib/runtimeConfig.ts";
import type { DayMovementsFormValues } from "./schema.ts";

const RESPONDENT_KEY_INVALID_STATUSES = new Set([400, 401, 403, 404, 422]);

export function extractRespondentKeyFromUrl(url: string): string | null {
  const parsedUrl = new URL(url);
  const keyFromRespondentParam = parsedUrl.searchParams.get("respondentKey")?.trim();
  if (keyFromRespondentParam) {
    return keyFromRespondentParam;
  }

  const keyFromKeyParam = parsedUrl.searchParams.get("key")?.trim();
  if (keyFromKeyParam) {
    return keyFromKeyParam;
  }

  return null;
}

/**
 * Validates respondent key against the backend endpoint.
 *
 * @returns true when key is valid, false when key is invalid
 */
export async function validateRespondentKey(respondentKey: string): Promise<boolean> {
  const endpoint = `${getApiBaseUrl()}/v1/public/forms/movements/respondent-keys/validate`;
  const validationUrl = `${endpoint}?respondentKey=${encodeURIComponent(respondentKey)}`;

  let response: Response;
  try {
    response = await fetch(validationUrl, {
      method: "GET",
    });
  } catch (error) {
    const message =
      error instanceof TypeError
        ? i18n.t("errors.respondentKeyValidationNetwork")
        : i18n.t("errors.respondentKeyValidationFailed");
    throw new ApiNetworkError(message, error);
  }

  if (response.ok) {
    return true;
  }

  if (RESPONDENT_KEY_INVALID_STATUSES.has(response.status)) {
    return false;
  }

  const message = i18n.t("errors.respondentKeyValidationFailed");
  throw new ApiHttpError(message, response.status, response.statusText);
}

/**
 * Submits the DayMovements form data as JSON to the public endpoint.
 *
 * @param data - Validated form values from react-hook-form
 * @returns The fetch Response object on success
 * @throws ApiNetworkError on network failure
 * @throws ApiHttpError on non-2xx responses
 */
export async function submitDayMovementsForm(data: DayMovementsFormValues, respondentKey: string): Promise<Response> {
  const endpoint = `${getApiBaseUrl()}/v1/public/forms/movements`;
  const payload = {
    ...data,
    respondentKey,
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const message =
      error instanceof TypeError ? i18n.t("errors.networkConnect") : i18n.t("errors.networkSend");
    throw new ApiNetworkError(message, error);
  }

  if (!response.ok) {
    let message = i18n.t("errors.serverErrorWithStatus", {
      status: response.status,
      statusText: response.statusText,
    });
    if (response.status === 400) {
      message = i18n.t("errors.badRequest");
    } else if (response.status === 404) {
      message = i18n.t("errors.endpointNotFound");
    } else if (response.status >= 500) {
      message = i18n.t("errors.internalServer");
    }
    throw new ApiHttpError(message, response.status, response.statusText);
  }

  return response;
}
