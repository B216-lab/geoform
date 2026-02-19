/**
 * Simplified address format expected by the backend.
 */
export interface SimplifiedAddress {
  value: string;
  latitude: number;
  longitude: number;
}

/**
 * DaData suggestion shape (the subset we actually use).
 */
export interface DaDataAddressSuggestion {
  value: string;
  unrestricted_value?: string;
  data: {
    geo_lat?: string;
    geo_lon?: string;
    house?: string | null;
    [key: string]: unknown;
  };
}

/**
 * Simplifies a DaData suggestion into `{ value, latitude, longitude }`.
 */
export function simplifyAddress(
  suggestion: DaDataAddressSuggestion | null | undefined,
): SimplifiedAddress | null {
  if (!suggestion) return null;

  const data = suggestion.data;
  if (data?.geo_lat && data?.geo_lon) {
    const lat = parseFloat(data.geo_lat);
    const lon = parseFloat(data.geo_lon);

    if (!isNaN(lat) && !isNaN(lon)) {
      return {
        value: suggestion.value || "",
        latitude: lat,
        longitude: lon,
      };
    }
  }

  return null;
}

/**
 * Validates that a DaData suggestion contains a house number.
 */
export function validateAddressHasHouse(
  suggestion: DaDataAddressSuggestion | null | undefined,
): boolean {
  if (!suggestion?.data || typeof suggestion.data !== "object") return false;
  return !!suggestion.data.house;
}
