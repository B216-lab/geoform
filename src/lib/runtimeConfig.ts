/**
 * Runtime configuration interface.
 * Populated from env.js generated at container startup.
 */
interface AppConfig {
  API_BASE_URL?: string;
  VITE_API_BASE_URL?: string;
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
  const runtimeApiUrl = globalThis.__APP_CONFIG__?.API_BASE_URL;
  if (runtimeApiUrl && runtimeApiUrl.trim() !== "") {
    return runtimeApiUrl.trim().replace(/\/+$/, "");
  }

  const runtimeLegacyUrl = globalThis.__APP_CONFIG__?.VITE_API_BASE_URL;
  if (runtimeLegacyUrl && runtimeLegacyUrl.trim() !== "") {
    return runtimeLegacyUrl.trim().replace(/\/+$/, "");
  }

  const buildTimeUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";
  return buildTimeUrl.toString().trim().replace(/\/+$/, "");
}
