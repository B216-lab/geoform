import { getApiBaseUrl } from "@/lib/runtimeConfig";
import { ApiHttpError, ApiNetworkError } from "@/lib/api";
import type { DayMovementsFormValues } from "./schema";

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
    const message =
      error instanceof TypeError
        ? "Не удалось подключиться к серверу."
        : "Ошибка сети при отправке формы.";
    throw new ApiNetworkError(message, error);
  }

  if (!response.ok) {
    let message = `Ошибка сервера: ${response.status} ${response.statusText}`;
    if (response.status === 400) {
      message = "Неверные данные формы. Проверьте заполненные поля.";
    } else if (response.status === 404) {
      message = "Сервер недоступен или эндпоинт не найден.";
    } else if (response.status >= 500) {
      message = "Внутренняя ошибка сервера. Попробуйте позже.";
    }
    throw new ApiHttpError(message, response.status, response.statusText);
  }

  return response;
}
