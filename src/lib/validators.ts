/**
 * Emirates ID: 784-YYYY-NNNNNNN-C, 15 digits. The demo checks the last digit
 * with the Luhn algorithm over the first 14 digits (Luhn-style, demo only).
 */
export const digitsOnly = (s: string) => s.replace(/\D/g, '');

export const luhnCheckDigit = (body: string) => {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    let d = Number(body[body.length - 1 - i]);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
};

export const formatEmiratesId = (raw: string) => {
  const d = digitsOnly(raw).slice(0, 15);
  const parts = [d.slice(0, 3), d.slice(3, 7), d.slice(7, 14), d.slice(14, 15)].filter(Boolean);
  return parts.join('-');
};

export type EidResult = { ok: true } | { ok: false; error: string };

export const validateEmiratesId = (raw: string): EidResult => {
  const d = digitsOnly(raw);
  if (d.length === 0) return { ok: false, error: 'Emirates ID is required.' };
  if (d.length !== 15) return { ok: false, error: 'Emirates ID must be 15 digits (784-YYYY-NNNNNNN-C).' };
  if (!d.startsWith('784')) return { ok: false, error: 'Emirates ID starts with 784.' };
  const year = Number(d.slice(3, 7));
  if (year < 1900 || year > 2026) return { ok: false, error: 'Birth year in the ID looks wrong.' };
  if (luhnCheckDigit(d.slice(0, 14)) !== Number(d[14])) return { ok: false, error: 'Check digit does not match. Re-check the last digit.' };
  return { ok: true };
};

/** Build a valid demo Emirates ID from a year and a 7 digit serial. */
export const makeEmiratesId = (year: number, serial: string) => {
  const body = `784${year}${serial.padStart(7, '0').slice(0, 7)}`;
  return formatEmiratesId(body + luhnCheckDigit(body));
};

/** UAE mobile: +971 5X XXX XXXX (also accepts 05X XXX XXXX). */
export const validateUaePhone = (raw: string) => {
  const d = digitsOnly(raw);
  const local = d.startsWith('971') ? d.slice(3) : d.startsWith('0') ? d.slice(1) : d;
  return /^5[024568]\d{7}$/.test(local);
};

export const validateName = (s: string) => {
  const t = s.trim();
  if (!t) return 'Patient name is required.';
  if (t.length < 3) return 'Enter the full name.';
  if (/\d/.test(t)) return 'Names cannot contain digits.';
  return null;
};
