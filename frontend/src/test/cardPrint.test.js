import { describe, it, expect } from 'vitest';
import { getTemplate } from '../utils/cardPrint';

describe('getTemplate()', () => {
  it('returns Manager template for manager position', () => {
    expect(getTemplate({ position: 'Project Manager' }).key).toBe('Manager');
  });

  it('returns Supervisor template for supervisor position', () => {
    expect(getTemplate({ position: 'Senior Developer' }).key).toBe('Supervisor');
  });

  it('returns Staff as default (including former Contractor/Vendor/Visitor keywords)', () => {
    expect(getTemplate({ position: 'Accountant' }).key).toBe('Staff');
    expect(getTemplate({ position: '' }).key).toBe('Staff');
    expect(getTemplate({}).key).toBe('Staff');
    expect(getTemplate({ position: 'Contractor' }).key).toBe('Staff');
    expect(getTemplate({ position: 'Vendor' }).key).toBe('Staff');
    expect(getTemplate({ position: 'Visitor' }).key).toBe('Staff');
  });

  it('returns Director as Manager', () => {
    expect(getTemplate({ position: 'Director' }).key).toBe('Manager');
  });
});
