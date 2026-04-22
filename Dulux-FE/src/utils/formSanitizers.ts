/**
 * Removes numeric characters from text input values.
 *
 * @param value - Raw input value.
 * @returns Value with all digits removed.
 */
export const sanitizeLettersOnly = (value: string): string => {
  return value.replace(/\d/g, '');
};

/**
 * Normalizes phone input to Pakistan format with required `92` prefix.
 *
 * @param value - Raw input value.
 * @returns Normalized phone number with `92` prefix and max local-part length of 10.
 */
export const normalizePkPhoneWithPrefix = (value: string): string => {
  const digitsOnly = value.replace(/\D/g, '');
  const withoutPrefix = digitsOnly.startsWith('92') ? digitsOnly.slice(2) : digitsOnly;
  const normalizedLocalPart = withoutPrefix.startsWith('3') ? withoutPrefix : `3${withoutPrefix}`;
  const limitedLocalPart = normalizedLocalPart.slice(0, 10);
  return `92${limitedLocalPart}`;
};
