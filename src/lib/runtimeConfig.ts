/**
 * Runtime configuration interface.
 * Populated from env.js generated at container startup.
 */
interface AppConfig {
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
  const runtimeUrl = window.__APP_CONFIG__?.VITE_API_BASE_URL;
  if (runtimeUrl && runtimeUrl.trim() !== "") {
    return runtimeUrl.trim().replace(/\/+$/, "");
  }

  const buildTimeUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";
  return buildTimeUrl.toString().trim().replace(/\/+$/, "");
}
