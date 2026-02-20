/**
 * Runtime configuration interface.
 * Populated from env.js generated at container startup.
 */
interface AppConfig {
  API_BASE_URL?: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig;
  }
}

/**
 * Returns the API base URL from runtime config or build-time fallback.
 * Runtime config takes priority so the value can be overridden via Docker
 * environment variables without rebuilding the image.
 */
export function getApiBaseUrl(): string {
  const appConfig =
    (globalThis as typeof globalThis & { __APP_CONFIG__?: AppConfig })
      .__APP_CONFIG__;
  const runtimeApiUrl = appConfig?.API_BASE_URL;
  if (runtimeApiUrl && runtimeApiUrl.trim() !== "") {
    return runtimeApiUrl.trim().replace(/\/+$/, "");
  } else {
    throw new Error("API_BASE_URL is not set");
  }
}
