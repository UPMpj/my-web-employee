import { describe, it, expect } from 'vitest';
import { photoUrl, validatePassword } from '../api';

describe('photoUrl()', () => {
  it('returns null when no photo', () => {
    expect(photoUrl(null)).toBeNull();
    expect(photoUrl(undefined)).toBeNull();
    expect(photoUrl('')).toBeNull();
  });

  it('returns Cloudinary URL as-is', () => {
    const url = 'https://res.cloudinary.com/dojdi5vk8/image/upload/v1/employees/test.jpg';
    expect(photoUrl(url)).toBe(url);
  });

  it('prepends API_BASE for local paths', () => {
    const result = photoUrl('/uploads/employees/test.jpg');
    expect(result).toMatch(/\/uploads\/employees\/test\.jpg$/);
  });
});

describe('validatePassword()', () => {
  it('rejects short passwords', () => {
    expect(validatePassword('Ab1!')).not.toBeNull();
  });

  it('rejects missing uppercase', () => {
    expect(validatePassword('abcdef1!')).not.toBeNull();
  });

  it('rejects missing number', () => {
    expect(validatePassword('Abcdefg!')).not.toBeNull();
  });

  it('rejects missing special character', () => {
    expect(validatePassword('Abcdefg1')).not.toBeNull();
  });

  it('accepts valid password', () => {
    expect(validatePassword('Abcdef1!')).toBeNull();
  });
});
