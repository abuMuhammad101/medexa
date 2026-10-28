import { describe, expect, it } from 'vitest';
import { digitsOnly, formatEmiratesId, luhnCheckDigit, makeEmiratesId, validateEmiratesId, validateName, validateUaePhone } from './validators';

describe('Emirates ID', () => {
  it('formats to the 784-YYYY-NNNNNNN-C mask and strips non-digits on paste', () => {
    expect(formatEmiratesId('784 1968-4471029x5')).toBe('784-1968-4471029-5');
    expect(formatEmiratesId('7841')).toBe('784-1');
  });

  it('accepts a generated valid ID', () => {
    const id = makeEmiratesId(1968, '4471029');
    expect(validateEmiratesId(id)).toEqual({ ok: true });
    expect(digitsOnly(id)).toHaveLength(15);
  });

  it('rejects wrong length, prefix, year and check digit', () => {
    expect(validateEmiratesId('')).toMatchObject({ ok: false });
    expect(validateEmiratesId('784-1968-447')).toMatchObject({ ok: false });
    expect(validateEmiratesId('785-1968-4471029-1')).toMatchObject({ ok: false });
    expect(validateEmiratesId('784-1800-4471029-1')).toMatchObject({ ok: false });
    const good = digitsOnly(makeEmiratesId(1968, '4471029'));
    const wrong = good.slice(0, 14) + String((Number(good[14]) + 1) % 10);
    expect(validateEmiratesId(wrong)).toMatchObject({ ok: false, error: expect.stringContaining('Check digit') });
  });

  it('computes a Luhn check digit', () => {
    expect(luhnCheckDigit('7992739871')).toBe(3);
  });
});

describe('phone and name', () => {
  it('validates UAE mobiles', () => {
    expect(validateUaePhone('+971 50 412 7781')).toBe(true);
    expect(validateUaePhone('0551234567')).toBe(true);
    expect(validateUaePhone('+971 4 123 4567')).toBe(false);
    expect(validateUaePhone('12345')).toBe(false);
  });
  it('validates names', () => {
    expect(validateName('')).toBeTruthy();
    expect(validateName('Al')).toBeTruthy();
    expect(validateName('John 3')).toBeTruthy();
    expect(validateName('John Doe')).toBeNull();
  });
});
