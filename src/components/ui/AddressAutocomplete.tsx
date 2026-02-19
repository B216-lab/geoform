import { useState, useEffect, useRef, useCallback } from "react";
import { Autocomplete, Loader } from "@mantine/core";
import type { DaDataAddressSuggestion } from "@/features/dayMovements/addressUtils";

interface AddressAutocompleteProps {
  value: DaDataAddressSuggestion | null;
  onChange: (value: DaDataAddressSuggestion | null) => void;
  getAddressItems: (query: string) => Promise<DaDataAddressSuggestion[]>;
  delay?: number;
  minChars?: number;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  withAsterisk?: boolean;
  description?: string;
  error?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  getAddressItems,
  delay = 1000,
  minChars = 3,
  disabled = false,
  placeholder = "Начните вводить адрес…",
  label,
  withAsterisk = false,
  description,
  error,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value?.value ?? "");
  const [suggestions, setSuggestions] = useState<DaDataAddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextNullSyncRef = useRef(false);

  // Sync display text when value changes externally
  useEffect(() => {
    if (value === null && skipNextNullSyncRef.current) {
      skipNextNullSyncRef.current = false;
      return;
    }
    setQuery(value?.value ?? "");
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const fetchSuggestions = useCallback(
    async (q: string) => {
      if (q.trim().length < minChars) {
        setSuggestions([]);
        return;
      }
      setIsLoading(true);
      try {
        const items = await getAddressItems(q);
        setSuggestions(items);
      } finally {
        setIsLoading(false);
      }
    },
    [getAddressItems, minChars],
  );

  const handleInputChange = (text: string) => {
    setQuery(text);
    // If user edits text after selecting, clear the structured value
    if (value && text !== value.value) {
      // Avoid wiping typed text when parent echoes value=null back.
      skipNextNullSyncRef.current = true;
      onChange(null);
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(text), delay);
  };

  const handleSelect = (suggestion: DaDataAddressSuggestion) => {
    onChange(suggestion);
    setQuery(suggestion.value);
  };

  return (
    <Autocomplete
      value={query}
      disabled={disabled}
      label={label}
      withAsterisk={withAsterisk}
      description={description}
      error={error}
      placeholder={placeholder}
      onChange={handleInputChange}
      data={suggestions.map((s) => s.value)}
      filter={({ options }) => options}
      autoComplete="off"
      rightSection={isLoading ? <Loader size={14} /> : null}
      onOptionSubmit={(selectedValue) => {
        const selected = suggestions.find((s) => s.value === selectedValue);
        if (selected) handleSelect(selected);
      }}
    />
  );
}
