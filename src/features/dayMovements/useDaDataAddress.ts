import { useCallback, useRef } from "react";
import { fetchDaDataSuggestionsAddress } from "./dadataApi";
import type { DaDataAddressSuggestion } from "./addressUtils";

const DEFAULT_ADDRESS_DELAY = 1000;
const DEFAULT_MIN_CHARS = 3;

/**
 * React hook that provides DaData address suggestion fetching
 * with automatic request cancellation on new input.
 */
export function useDaDataAddress(minChars: number = DEFAULT_MIN_CHARS) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentQueryRef = useRef<string | null>(null);

  const getAddressItems = useCallback(
    async (searchQuery: string): Promise<DaDataAddressSuggestion[]> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      currentQueryRef.current = searchQuery;

      if (!searchQuery || searchQuery.trim().length < minChars) {
        return [];
      }

      try {
        const { suggestions } = await fetchDaDataSuggestionsAddress(
          controller.signal,
          { query: searchQuery },
        );

        if (
          controller.signal.aborted ||
          currentQueryRef.current !== searchQuery
        ) {
          return [];
        }

        return suggestions ?? [];
      } catch (err) {
        if (
          controller.signal.aborted ||
          currentQueryRef.current !== searchQuery
        ) {
          return [];
        }
        console.error("[DaData] Error while fetching suggestions", err);
        return [];
      }
    },
    [minChars],
  );

  return {
    getAddressItems,
    ADDRESS_DELAY: DEFAULT_ADDRESS_DELAY,
    DEFAULT_MIN_CHARS: minChars,
  } as const;
}
