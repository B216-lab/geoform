/**
 * Keys for environment variables used by the app.
 */
export enum EnvKey {
  DaDataApiKey = "VITE_DADATA_KEY",
  DaDataApiUrl = "VITE_DADATA_API",
}

/**
 * Returns the value of the given Vite environment variable.
 * Throws if the variable is not set.
 */
export function getEnvValue(key: EnvKey): string {
  const value = import.meta.env[key];
  if (!value) {
    console.error(`Environment variable "${key}" is not set`);
    throw new Error(`ENV variable "${key}" is not set`);
  }
  return String(value);
}
