import { getApiBaseUrl } from "./runtimeConfig.ts";
import i18n from "./i18n.ts";

/**
 * Network-level error (server unreachable, timeout, etc.).
 */
export class ApiNetworkError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "ApiNetworkError";
  }
}

/**
 * HTTP-level error (4xx / 5xx responses).
 */
export class ApiHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super(message);
    this.name = "ApiHttpError";
  }
}

/**
 * Performs a fetch request to the API.
 * Automatically prepends the base URL and includes cookies.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${getApiBaseUrl()}${path}`;

  const headers = new Headers(options.headers || {});

  if (
    options.body &&
    !headers.has("Content-Type") &&
    typeof options.body === "string"
  ) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch (error) {
    const errorMessage = error instanceof TypeError
      ? i18n.t("errors.networkConnectWithHint")
      : i18n.t("errors.networkGeneric");
    throw new ApiNetworkError(errorMessage, error);
  }

  if (!response.ok) {
    let errorMessage = i18n.t("errors.serverErrorWithStatus", {
      status: response.status,
      statusText: response.statusText,
    });

    if (response.status === 404) {
      errorMessage = i18n.t("errors.endpointNotFound");
    } else if (response.status >= 500) {
      errorMessage = i18n.t("errors.internalServer");
    }

    throw new ApiHttpError(errorMessage, response.status, response.statusText);
  }

  return response;
}
