function normalizePhoneDigits(phone: string) {
  return phone.replace(/\D/g, '');
}

export function normalizePhoneNumber(phone: string) {
  const trimmed = phone.trim();
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}

export function buildPhoneLoginEmail(phone: string) {
  const digits = normalizePhoneDigits(normalizePhoneNumber(phone));

  if (!digits) {
    throw new Error('A valid phone number is required.');
  }

  return `${digits}@phone.addis.local`;
}
