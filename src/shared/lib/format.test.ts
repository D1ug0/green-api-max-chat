import { describe, expect, it } from 'vitest';
import { normalizePhone } from './format';

describe('normalizePhone', () => {
  it.each([
    ['+7 (999) 123-45-67', '79991234567'],
    ['8 999 123 45 67', '79991234567'],
    ['+375 (29) 123-45-67', '375291234567'],
  ])('normalizes %s', (input, expected) => expect(normalizePhone(input)).toBe(expected));
  it.each(['', '+1 202 555 0123', '7999123456', '79991234567script', '7.9991234567'])(
    'rejects invalid input %s',
    (input) => expect(() => normalizePhone(input)).toThrow(),
  );
});
