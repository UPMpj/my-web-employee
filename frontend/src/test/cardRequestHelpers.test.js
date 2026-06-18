import { describe, it, expect } from 'vitest';
import { companyInitials, companyAvatarColor, requestNo, fmtDate, displayStatus, AVATAR_COLORS } from '../utils/cardRequestHelpers';

describe('companyInitials()', () => {
  it('returns 2 chars for single word', () => {
    expect(companyInitials('JOJO')).toBe('JO');
  });
  it('returns first letters of two words', () => {
    expect(companyInitials('UDM Company')).toBe('UC');
  });
  it('handles empty input', () => {
    expect(companyInitials('')).toBe('–');
    expect(companyInitials(null)).toBe('–');
  });
});

describe('companyAvatarColor()', () => {
  it('returns a color string', () => {
    const color = companyAvatarColor(1);
    expect(AVATAR_COLORS).toContain(color);
  });
  it('handles null id', () => {
    expect(AVATAR_COLORS).toContain(companyAvatarColor(null));
  });
});

describe('requestNo()', () => {
  it('formats request number correctly', () => {
    const result = requestNo({ batch_id: 5, created_at: '2026-06-17' });
    expect(result).toBe('CR-2026-00005');
  });
});

describe('fmtDate()', () => {
  it('formats date in en-GB style', () => {
    const result = fmtDate('2026-06-17');
    expect(result).toContain('2026');
  });
  it('returns – for null', () => {
    expect(fmtDate(null)).toBe('–');
  });
});

describe('displayStatus()', () => {
  it('returns printed when all issued and printed', () => {
    const b = { status: 'approved', all_issued: true, all_printed: true };
    expect(displayStatus(b)).toBe('printed');
  });
  it('returns issued when all issued but not printed', () => {
    const b = { status: 'approved', all_issued: true, all_printed: false };
    expect(displayStatus(b)).toBe('issued');
  });
  it('returns original status for non-approved', () => {
    expect(displayStatus({ status: 'pending' })).toBe('pending');
    expect(displayStatus({ status: 'rejected' })).toBe('rejected');
  });
});
