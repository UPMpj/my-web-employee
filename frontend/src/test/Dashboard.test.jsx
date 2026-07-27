import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { api } from '../api';
import Dashboard from '../pages/main/Dashboard';

vi.mock('../api', () => ({
  api: { get: vi.fn() },
}));

const STATS = { companies: 10, newCompanies: 2, employees: 100, onLeave: 10, resigned: 20, activeCards: 50, newActiveCards: 5 };
const TREND = [
  { month: 'Feb', count: 80 }, { month: 'Mar', count: 90 },
  { month: 'Apr', count: 95 }, { month: 'May', count: 100 },
];

function mockApiFor({ stats = STATS, trend = TREND, byCompany = [], activity = [], buildings = [], growth = [] } = {}) {
  api.get.mockImplementation((url) => {
    if (url === '/dashboard/stats')     return Promise.resolve({ data: stats });
    if (url === '/dashboard/by-company') return Promise.resolve({ data: byCompany });
    if (url === '/dashboard/trend')      return Promise.resolve({ data: trend });
    if (url === '/dashboard/activity')   return Promise.resolve({ data: activity });
    if (url === '/company/summary')      return Promise.resolve({ data: { growth } });
    if (url === '/building')             return Promise.resolve({ data: buildings });
    return Promise.reject(new Error('unexpected url ' + url));
  });
}

function renderDashboard() {
  const { container } = render(
    <LanguageProvider>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </LanguageProvider>
  );
  return container;
}

/* The KPI cards and donut render numbers/percentages as several sibling text
   nodes inside one element (e.g. "↗ 5% from last month"), so we read the
   relevant container's textContent directly rather than fighting getByText's
   exact-match semantics over concatenated nodes. */
function statCardByLabel(container, label) {
  const labels = Array.from(container.querySelectorAll('.db-stat-label'));
  const labelEl = labels.find(el => el.textContent === label);
  return labelEl?.closest('.db-stat-card') ?? null;
}

function donutRowByName(container, name) {
  const rows = Array.from(container.querySelectorAll('.db-donut-legend-row'));
  return rows.find(row => row.textContent.includes(name)) ?? null;
}

describe('Dashboard — KPI calculations', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ role: 'Super Admin', fullname: 'Admin' }));
    localStorage.setItem('lang', 'en');
    api.get.mockReset();
  });

  it('waits for stats to load, then renders the stat cards', async () => {
    mockApiFor();
    const container = renderDashboard();
    await waitFor(() => expect(container.querySelector('.db-stats-grid')).toBeTruthy());
    expect(statCardByLabel(container, 'Total Employees').querySelector('.db-stat-value').textContent).toBe('100');
  });

  it('computes month-over-month employee trend % from the last two trend points', async () => {
    mockApiFor();
    const container = renderDashboard();
    await waitFor(() => expect(container.querySelector('.db-stats-grid')).toBeTruthy());
    // trend: 95 -> 100 = +5.26%, rounds to 5
    const card = statCardByLabel(container, 'Total Employees');
    expect(card.querySelector('.db-stat-trend').textContent).toMatch(/5%/);
  });

  it('computes the companies trend % as newCompanies / companies', async () => {
    mockApiFor();
    const container = renderDashboard();
    await waitFor(() => expect(container.querySelector('.db-stats-grid')).toBeTruthy());
    // 2 new / 10 total = 20%
    const card = statCardByLabel(container, 'Total Companies');
    expect(card.querySelector('.db-stat-trend').textContent).toMatch(/20%/);
  });

  it('derives active/on_leave/resigned from employees minus onLeave minus resigned, feeding the donut', async () => {
    mockApiFor();
    const container = renderDashboard();
    await waitFor(() => expect(container.querySelector('.db-donut-total')).toBeTruthy());

    // active = 100 - 10 - 20 = 70; total shown in the donut center = 70 + 10 + 20 = 100
    expect(container.querySelector('.db-donut-total').textContent).toBe('100');
    expect(donutRowByName(container, 'Active').querySelector('b').textContent).toBe('70');
    expect(donutRowByName(container, 'On Leave').querySelector('b').textContent).toBe('10');
    expect(donutRowByName(container, 'Resigned').querySelector('b').textContent).toBe('20');
  });

  it('computes each donut slice as a percentage of the status total', async () => {
    mockApiFor();
    const container = renderDashboard();
    await waitFor(() => expect(container.querySelector('.db-donut-total')).toBeTruthy());

    expect(donutRowByName(container, 'Active').querySelector('.db-donut-pct').textContent).toBe('70%');
    expect(donutRowByName(container, 'On Leave').querySelector('.db-donut-pct').textContent).toBe('10%');
    expect(donutRowByName(container, 'Resigned').querySelector('.db-donut-pct').textContent).toBe('20%');
  });

  it('hides the Available Rooms card entirely for non-Super-Admin roles', async () => {
    localStorage.setItem('user', JSON.stringify({ role: 'Company Admin', fullname: 'Bob' }));
    mockApiFor();
    const container = renderDashboard();
    await waitFor(() => expect(container.querySelector('.db-stats-grid')).toBeTruthy());
    expect(statCardByLabel(container, 'Available Rooms')).toBeNull();
  });

  it('shows a retry button and no stat cards when the stats request fails', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/dashboard/stats') return Promise.reject(new Error('down'));
      return Promise.resolve({ data: [] });
    });
    const container = renderDashboard();
    expect(await screen.findByText('ລອງໃໝ່')).toBeTruthy();
    expect(container.querySelector('.db-stats-grid')).toBeNull();
  });
});
