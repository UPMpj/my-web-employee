import { describe, it, expect } from 'vitest';
import { csvCell } from '../utils/csvCell';

describe('csvCell()', () => {
  it('quotes a plain value as-is', () => {
    expect(csvCell('Somchai')).toBe('"Somchai"');
  });

  it('escapes embedded double quotes', () => {
    expect(csvCell('Say "hi"')).toBe('"Say ""hi"""');
  });

  it('prefixes a leading = with a single quote (formula injection)', () => {
    expect(csvCell('=cmd|/c calc!A0')).toBe('"\'=cmd|/c calc!A0"');
  });

  it('prefixes leading +, -, @ the same way', () => {
    expect(csvCell('+1+1')).toBe('"\'+1+1"');
    expect(csvCell('-1+1')).toBe('"\'-1+1"');
    expect(csvCell('@SUM(1,1)')).toBe('"\'@SUM(1,1)"');
  });

  it('leaves a value that merely contains = in the middle untouched', () => {
    expect(csvCell('a=b')).toBe('"a=b"');
  });

  it('handles null/undefined as empty string', () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it('stringifies numbers', () => {
    expect(csvCell(42)).toBe('"42"');
  });
});
