import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import type { DaDataAddressSuggestion } from "./addressUtils.ts";
import { EnvKey, getEnvValue } from "../../lib/env.ts";

const API_KEY = getEnvValue(EnvKey.DaDataApiKey);
const API_URL = getEnvValue(EnvKey.DaDataApiUrl);

const apiDaDataInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Token ${API_KEY}`,
  },
});

async function createDaDataRequest<T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> {
  try {
    const response: AxiosResponse = await apiDaDataInstance({
      ...config,
      ...options,
    });
    return response.data as T;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = "DaData request failed";
      console.error("[DaDataAPI] Request error", {
        message,
        status: error.response?.status,
        url: error.config?.url,
      });
      throw new AxiosError(
        message,
        error.response?.status?.toString(),
        error.config,
        error.request,
        error.response,
      );
    }
    throw error;
  }
}

interface DaDataSuggestionsResponse {
  suggestions: DaDataAddressSuggestion[] | undefined;
}

export function fetchDaDataSuggestionsAddress(
  signal: AbortSignal,
  params: { query: string },
): Promise<DaDataSuggestionsResponse> {
  return createDaDataRequest({ method: "GET", signal, params });
}
