import { describe, expect, it } from 'vitest';
import { normalizePhone } from './create-attendance-registration.dto.js';

describe('normalizePhone', () => {
  it.each([
    ['01012345678', '201012345678'],
    ['٠١٠١٢٣٤٥٦٧٨', '201012345678'],
    ['۰۱۰۱۲۳۴۵۶۷۸', '201012345678'],
    ['20 101 234 5678', '201012345678'],
    ['+20 (101) 234-5678', '201012345678'],
    ['00201012345678', '201012345678'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('leaves non-string values for class-validator to reject', () => {
    expect(normalizePhone(123)).toBe(123);
  });
});
