/**
 * Phone number utilities for E.164 international standard format.
 * E.164 format: +[country_code][national_number], up to 15 digits.
 */

/**
 * Normalizes any phone number string into strict E.164 format (+[country_code][digits]).
 * 
 * @param rawPhone - Raw input string (e.g. "+1 (415) 555-2671", "9876543210", "0091-98765-43210")
 * @param defaultCountryCode - Country code without '+' to use if a 10-digit number is provided (defaults to '91')
 * @returns Standardized E.164 phone string (e.g. "+919876543210") or empty string if invalid
 */
export function normalizeToE164(rawPhone?: string | null, defaultCountryCode = '91'): string {
  if (!rawPhone) return '';
  const trimmed = rawPhone.trim();
  if (!trimmed || trimmed === 'N/A') return '';

  // If starts with '+', keep '+' and strip all non-digits
  if (trimmed.startsWith('+')) {
    const digits = trimmed.substring(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  // If starts with international call prefix '00'
  if (trimmed.startsWith('00')) {
    const digits = trimmed.substring(2).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  // Strip all non-digit characters
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return '';

  // 10 digits without country code -> add default country code
  if (digitsOnly.length === 10) {
    const cleanCC = defaultCountryCode.replace(/\D/g, '') || '91';
    return `+${cleanCC}${digitsOnly}`;
  }

  // 11 digits starting with 1 (US / Canada)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }

  // 12 digits starting with 91 (India)
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }

  // 11-13 digits for common international numbers
  if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }

  return `+${digitsOnly}`;
}

/**
 * Validates whether a phone number string satisfies strict E.164 format.
 * Format: + followed by 7 to 15 digits, first digit cannot be 0.
 */
export function isValidE164(phone?: string | null): boolean {
  if (!phone) return false;
  return /^\+[1-9]\d{6,14}$/.test(phone.trim());
}

/**
 * Formats an E.164 phone number into a user-friendly display format.
 * Example: "+919876543210" -> "+91 98765 43210", "+14155552671" -> "+1 (415) 555-2671"
 */
export function formatPhoneDisplay(phone?: string | null): string {
  if (!phone) return '';
  const e164 = normalizeToE164(phone);
  if (!e164) return phone || '';

  // US format: +1XXXXXXXXXX -> +1 (XXX) XXX-XXXX
  if (e164.startsWith('+1') && e164.length === 12) {
    const area = e164.slice(2, 5);
    const mid = e164.slice(5, 8);
    const last = e164.slice(8, 12);
    return `+1 (${area}) ${mid}-${last}`;
  }

  // India format: +91XXXXXXXXXX -> +91 XXXXX XXXXX
  if (e164.startsWith('+91') && e164.length === 13) {
    const p1 = e164.slice(3, 8);
    const p2 = e164.slice(8, 13);
    return `+91 ${p1} ${p2}`;
  }

  return e164;
}
