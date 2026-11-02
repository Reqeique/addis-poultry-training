function normalizePhoneDigits(phone: string) {
  return phone.replace(/\D/g, '');
}

export function normalizePhoneNumber(phone: string) {
  const trimmed = phone.trim();
  let digits = trimmed.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  // Handle accidental double country-code with leading 0 (e.g. 2510911... -> 251911...)
  if (digits.startsWith('2510') && digits.length === 13) {
    digits = '251' + digits.slice(4);
  } else if (digits.startsWith('251')) {
    // Already prefixed with Ethiopian country code
  } else if (digits.startsWith('0') && digits.length === 10) {
    // Local 10-digit number e.g. 0911223344 or 0711223344 -> 251911223344
    digits = '251' + digits.slice(1);
  } else if ((digits.startsWith('9') || digits.startsWith('7')) && digits.length === 9) {
    // Local 9-digit number e.g. 911223344 -> 251911223344
    digits = '251' + digits;
  } else if (!digits.startsWith('251')) {
    digits = '251' + digits;
  }

  return `+${digits}`;
}

export function buildPhoneLoginEmail(phone: string) {
  const normalized = normalizePhoneNumber(phone);
  const digits = normalizePhoneDigits(normalized);

  if (!digits) {
    throw new Error('A valid phone number is required.');
  }

  return `${digits}@phone.addis.local`;
}
