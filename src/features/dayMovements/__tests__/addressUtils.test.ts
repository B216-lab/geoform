import { describe, it, expect } from "vitest";
import {
  simplifyAddress,
  validateAddressHasHouse,
  type DaDataAddressSuggestion,
} from "../addressUtils";

describe("simplifyAddress", () => {
  it("returns null for null input", () => {
    expect(simplifyAddress(null)).toBeNull();
  });

  it("returns null when geo_lat / geo_lon are missing", () => {
    const suggestion: DaDataAddressSuggestion = {
      value: "Some address",
      data: {},
    };
    expect(simplifyAddress(suggestion)).toBeNull();
  });

  it("returns simplified address with valid coordinates", () => {
    const suggestion: DaDataAddressSuggestion = {
      value: "ул. Ленина, д. 1",
      data: { geo_lat: "52.2978", geo_lon: "104.2964" },
    };
    const result = simplifyAddress(suggestion);
    expect(result).toEqual({
      value: "ул. Ленина, д. 1",
      latitude: 52.2978,
      longitude: 104.2964,
    });
  });

  it("returns null when coordinates are not parseable", () => {
    const suggestion: DaDataAddressSuggestion = {
      value: "test",
      data: { geo_lat: "abc", geo_lon: "def" },
    };
    expect(simplifyAddress(suggestion)).toBeNull();
  });
});

describe("validateAddressHasHouse", () => {
  it("returns false for null", () => {
    expect(validateAddressHasHouse(null)).toBe(false);
  });

  it("returns false when house is missing", () => {
    const suggestion: DaDataAddressSuggestion = {
      value: "City",
      data: { house: null },
    };
    expect(validateAddressHasHouse(suggestion)).toBe(false);
  });

  it("returns true when house is present", () => {
    const suggestion: DaDataAddressSuggestion = {
      value: "Street, 5",
      data: { house: "5" },
    };
    expect(validateAddressHasHouse(suggestion)).toBe(true);
  });
});
