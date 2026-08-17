import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext';
import { api } from '../api';
import IdCard from '../pages/main/IdCard';

vi.mock('../api', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  photoUrl: () => null,
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../utils/cardPrint', () => ({ getTemplate: () => ({ key: 'Staff' }), printCards: vi.fn() }));

const ROLE_COUNTS = { all: 10, staff: 5, supervisor: 2, manager: 2 };
const STATS = {
  total_cards: 6, no_card: 4, printed: 3,
  printed_this_month: 5, printed_last_month: 2,
  resigned_with_card: 0, card_returned: 0, not_returned: 0,
};

function mockApi() {
  api.get.mockReset();
  api.get.mockImplementation((url) => {
    if (url === '/idcard') {
      return Promise.resolve({ data: { data: [], total: 10, ...STATS, role_counts: ROLE_COUNTS } });
    }
    if (url.startsWith('/company/')) return Promise.resolve({ data: [] });
    return Promise.reject(new Error('unexpected url ' + url));
  });
}

function renderIdCard() {
  return render(
    <LanguageProvider>
      <IdCard />
    </LanguageProvider>
  );
}

function lastIdcardCallParams() {
  const call = api.get.mock.calls.filter(c => c[0] === '/idcard').pop();
  return call[1].params;
}

function kpiTileByLabel(label) {
  return Array.from(document.querySelectorAll('.idc-kpi-tile')).find(el => el.textContent.includes(label));
}

describe('IdCard — role count chips', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ role: 'Super Admin' }));
    localStorage.setItem('lang', 'en');
    mockApi();
  });

  it('renders each role chip with the count from the API response', async () => {
    renderIdCard();
    await waitFor(() => expect(document.querySelector('.idc-role-filters')).toBeTruthy());

    const chips = Array.from(document.querySelectorAll('.idc-role-chip'));
    const countFor = (label) => chips.find(c => c.textContent.includes(label))?.querySelector('.idc-role-chip-count').textContent;

    expect(countFor('All')).toBe('10');
    expect(countFor('Staff')).toBe('5');
    expect(countFor('Supervisor')).toBe('2');
    expect(countFor('Manager')).toBe('2');
  });

  it('clicking a role chip loads with that role_filter and marks it active', async () => {
    renderIdCard();
    await waitFor(() => expect(document.querySelector('.idc-role-filters')).toBeTruthy());

    const managerChip = Array.from(document.querySelectorAll('.idc-role-chip')).find(c => c.textContent.includes('Manager'));
    fireEvent.click(managerChip);

    await waitFor(() => expect(lastIdcardCallParams().role_filter).toBe('manager'));
    expect(managerChip.className).toContain('idc-role-chip-active');
  });

  it('clicking the same role chip again clears the filter (toggle off)', async () => {
    renderIdCard();
    await waitFor(() => expect(document.querySelector('.idc-role-filters')).toBeTruthy());

    const managerChip = Array.from(document.querySelectorAll('.idc-role-chip')).find(c => c.textContent.includes('Manager'));
    fireEvent.click(managerChip);
    await waitFor(() => expect(lastIdcardCallParams().role_filter).toBe('manager'));

    fireEvent.click(managerChip);
    await waitFor(() => expect(lastIdcardCallParams().role_filter).toBe(''));
  });
});

describe('IdCard — KPI tiles', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ role: 'Super Admin' }));
    localStorage.setItem('lang', 'en');
    mockApi();
  });

  it('shows the printed-this-month count and the +/- delta vs last month', async () => {
    renderIdCard();
    await waitFor(() => expect(document.querySelector('.idc-kpi-row')).toBeTruthy());

    const tile = kpiTileByLabel('Printed This Month');
    expect(tile.querySelector('.idc-kpi-value').textContent).toBe('5');
    // 5 - 2 = +3
    expect(tile.querySelector('.idc-kpi-pct-num').textContent).toBe('+3');
  });

  it('shows a negative delta when this month is behind last month', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/idcard') {
        return Promise.resolve({
          data: { data: [], total: 10, ...STATS, printed_this_month: 1, printed_last_month: 4, role_counts: ROLE_COUNTS },
        });
      }
      return Promise.resolve({ data: [] });
    });
    renderIdCard();
    await waitFor(() => expect(document.querySelector('.idc-kpi-row')).toBeTruthy());

    const tile = kpiTileByLabel('Printed This Month');
    // 1 - 4 = -3
    expect(tile.querySelector('.idc-kpi-pct-num').textContent).toBe('-3');
  });

  it('computes Has Card / No Card as a percentage of the total', async () => {
    renderIdCard();
    await waitFor(() => expect(document.querySelector('.idc-kpi-row')).toBeTruthy());

    // total_cards=6, no_card=4, total=10 -> 60% / 40%
    expect(kpiTileByLabel('Has Card').querySelector('.idc-kpi-pct-num').textContent).toBe('60%');
    expect(kpiTileByLabel('No Card').querySelector('.idc-kpi-pct-num').textContent).toBe('40%');
  });
});

describe('IdCard — sort', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ role: 'Super Admin' }));
    localStorage.setItem('lang', 'en');
    mockApi();
  });

  it('changing the sort dropdown re-loads with the chosen sort and resets to page 1', async () => {
    renderIdCard();
    await waitFor(() => expect(document.querySelector('.idc-sort-select')).toBeTruthy());

    fireEvent.change(document.querySelector('.idc-sort-select'), { target: { value: 'name' } });

    await waitFor(() => expect(lastIdcardCallParams().sort).toBe('name'));
    expect(lastIdcardCallParams().page).toBe(1);
  });
});
