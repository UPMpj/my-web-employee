import { describe, it, expect } from 'vitest';
import { getTemplate } from '../utils/cardPrint';

describe('getTemplate()', () => {
  it('returns Manager template for manager position', () => {
    expect(getTemplate({ position: 'Project Manager' }).key).toBe('Manager');
  });

  it('returns Supervisor template for supervisor position', () => {
    expect(getTemplate({ position: 'Senior Developer' }).key).toBe('Supervisor');
  });

  it('returns Contractor template for contractor', () => {
    expect(getTemplate({ position: 'Contractor' }).key).toBe('Contractor');
  });

  it('returns Vendor template for vendor/shop', () => {
    expect(getTemplate({ position: 'Vendor' }).key).toBe('Vendor');
  });

  it('returns Visitor template for visitor', () => {
    expect(getTemplate({ position: 'Visitor' }).key).toBe('Visitor');
  });

  it('returns Staff as default', () => {
    expect(getTemplate({ position: 'Accountant' }).key).toBe('Staff');
    expect(getTemplate({ position: '' }).key).toBe('Staff');
    expect(getTemplate({}).key).toBe('Staff');
  });

  it('returns Director as Manager', () => {
    expect(getTemplate({ position: 'Director' }).key).toBe('Manager');
  });
});
