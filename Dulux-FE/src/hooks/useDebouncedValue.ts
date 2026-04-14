import { useEffect, useState } from 'react';

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Returns a debounced copy of a value that updates only after the provided delay.
 *
 * @param value - Source value to debounce.
 * @param delayMs - Debounce delay in milliseconds.
 * @returns Debounced value.
 */
export const useDebouncedValue = <T>(value: T, delayMs: number = DEFAULT_DEBOUNCE_MS): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
};
