import { getApiBaseUrl } from "../../lib/runtimeConfig.ts";
import { ApiHttpError, ApiNetworkError } from "../../lib/api.ts";
import i18n from "../../lib/i18n.ts";
import type { DayMovementsFormValues } from "./schema.ts";

/**
 * Submits the DayMovements form data as JSON to the public endpoint.
 *
 * @param data - Validated form values from react-hook-form
 * @returns The fetch Response object on success
 * @throws ApiNetworkError on network failure
 * @throws ApiHttpError on non-2xx responses
 */
export async function submitDayMovementsForm(
  data: DayMovementsFormValues,
): Promise<Response> {
  const endpoint = `${getApiBaseUrl()}/v1/public/forms/movements`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (error) {
    const message = error instanceof TypeError
      ? i18n.t("errors.networkConnect")
      : i18n.t("errors.networkSend");
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
