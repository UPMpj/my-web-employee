import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { CompanyProvider } from '../context/CompanyContext';
import { api } from '../api';
import Employees from '../pages/main/Employees';

vi.mock('../api', () => ({
  api: { get: vi.fn() },
  API_BASE: 'http://localhost:5001',
  photoUrl: () => null,
}));

const KPI_STATS = { employees: 100, onLeave: 10, resigned: 20, activeCards: 50, newActiveCards: 5 };

function makeEmployee(id) {
  return {
    employee_id: id, employee_code: `E${id}`, firstname: `First${id}`, lastname: `Last${id}`,
    position: 'Staff', status: 'Active', hired_at: '2020-01-01', companies_name: 'ACME',
  };
}

/* Total = 25 so pagination has 3 pages at pageSize=10 */
const ALL_EMPLOYEES = Array.from({ length: 25 }, (_, i) => makeEmployee(i + 1));

function mockApi() {
  api.get.mockReset();
  api.get.mockImplementation((url, config) => {
    if (url === '/employees') {
      const { page = 1, limit = 10, search = '', position = 'all' } = config?.params || {};
      let rows = ALL_EMPLOYEES;
      if (search) rows = rows.filter(e => `${e.firstname}${e.lastname}`.toLowerCase().includes(String(search).toLowerCase()));
      if (position !== 'all') rows = rows.filter(e => e.position === position);
      const start = (page - 1) * limit;
      return Promise.resolve({ data: { data: rows.slice(start, start + limit), total: rows.length } });
    }
    if (url === '/employees/meta/positions') return Promise.resolve({ data: ['Manager', 'Staff'] });
    if (url === '/employees/export/turnstile/pending') return Promise.resolve({ data: [] });
    if (url === '/dashboard/stats') return Promise.resolve({ data: KPI_STATS });
    if (url === '/dashboard/trend') return Promise.resolve({ data: [] });
    if (url.startsWith('/company/')) return Promise.resolve({ data: [] });
    return Promise.reject(new Error('unexpected url ' + url));
  });
}

function renderEmployees() {
  return render(
    <LanguageProvider>
      <CompanyProvider>
        <MemoryRouter initialEntries={['/employees']}>
          <Employees />
        </MemoryRouter>
      </CompanyProvider>
    </LanguageProvider>
  );
}

function lastEmployeesCallParams() {
  const call = api.get.mock.calls.filter(c => c[0] === '/employees').pop();
  return call[1].params;
}

/* The mobile card list renders unconditionally in the DOM (hidden by a CSS
   media query, which happy-dom doesn't apply), so any given employee's name
   shows up twice — once in the table, once in the mobile card. Scope every
   "did it load" check to the table body specifically. */
function tableText() {
  return document.querySelector('.emp-table')?.textContent || '';
}

async function waitForTableRow(text) {
  await waitFor(() => expect(tableText()).toContain(text));
}

describe('Employees — KPI cards', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ role: 'Super Admin' }));
    mockApi();
  });

  it('derives active personnel as total - onLeave - resigned', async () => {
    renderEmployees();
    await waitForTableRow('First1');
    const card = Array.from(document.querySelectorAll('.pn-stat-card'))
      .find(el => el.textContent.includes('Active Personnel'));
    // 100 - 10 - 20 = 70
    expect(card.querySelector('.pn-stat-value').textContent).toBe('70');
  });

  it('shows the resigned count and its percentage of total', async () => {
    renderEmployees();
    await waitForTableRow('First1');
    const card = Array.from(document.querySelectorAll('.pn-stat-card'))
      .find(el => el.textContent.includes('Resigned'));
    expect(card.querySelector('.pn-stat-value').textContent).toBe('20');
    // 20 / 100 = 20%
    expect(card.textContent).toMatch(/20%/);
  });
});

describe('Employees — filter state', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ role: 'Super Admin' }));
    mockApi();
  });

  it('loads the unfiltered first page on mount', async () => {
    renderEmployees();
    await waitForTableRow('First1');
    expect(lastEmployeesCallParams()).toMatchObject({ page: 1, search: '', position: 'all' });
  });

  it('typing in the search box re-fetches with the search param and resets to page 1', async () => {
    renderEmployees();
    await waitForTableRow('First1');

    fireEvent.change(screen.getByPlaceholderText(/ຄົ້ນຫາຊື່/), { target: { value: 'First2' } });

    await waitFor(() => expect(lastEmployeesCallParams().search).toBe('First2'));
    expect(lastEmployeesCallParams().page).toBe(1);
  });

  it('resetFilters clears search/position/status back to defaults', async () => {
    renderEmployees();
    await waitForTableRow('First1');

    fireEvent.change(screen.getByPlaceholderText(/ຄົ້ນຫາຊື່/), { target: { value: 'First2' } });
    await waitFor(() => expect(lastEmployeesCallParams().search).toBe('First2'));

    // pick a non-default value in every "more filters" dropdown before resetting,
    // so the assertions below can actually tell whether reset touched each one
    const selects = Array.from(document.querySelectorAll('.emp-filter-select'));
    const positionSelect = selects.find(s => Array.from(s.options).some(o => o.value === 'Manager'));
    const statusSelect   = selects.find(s => Array.from(s.options).some(o => o.value === 'Active'));
    const genderSelect   = selects.find(s => Array.from(s.options).some(o => o.value === 'Male'));
    fireEvent.change(positionSelect, { target: { value: 'Manager' } });
    fireEvent.change(statusSelect,   { target: { value: 'Active' } });
    fireEvent.change(genderSelect,   { target: { value: 'Male' } });
    await waitFor(() => expect(lastEmployeesCallParams().position).toBe('Manager'));

    const resetBtn = screen.getByRole('button', { name: /Reset/i });
    fireEvent.click(resetBtn);

    await waitFor(() => expect(lastEmployeesCallParams().search).toBe(''));
    expect(lastEmployeesCallParams()).toMatchObject({ status: 'all', position: 'all', gender: 'all', page: 1 });
  });
});

describe('Employees — pagination', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ role: 'Super Admin' }));
    mockApi();
  });

  it('renders 3 page buttons for 25 employees at 10 per page', async () => {
    renderEmployees();
    await waitForTableRow('First1');
    const pageButtons = Array.from(document.querySelectorAll('.emp-pg-btn'))
      .filter(b => /^[0-9]+$/.test(b.textContent));
    expect(pageButtons.map(b => b.textContent)).toEqual(['1', '2', '3']);
  });

  it('clicking page 2 fetches page 2 and shows its rows', async () => {
    renderEmployees();
    await waitForTableRow('First1');

    const page2Btn = Array.from(document.querySelectorAll('.emp-pg-btn')).find(b => b.textContent === '2');
    fireEvent.click(page2Btn);

    await waitForTableRow('First11');
    expect(lastEmployeesCallParams().page).toBe(2);
    expect(tableText()).not.toContain('First1 ');
  });

  it('disables the first/prev buttons on page 1 and last/next buttons on the last page', async () => {
    renderEmployees();
    await waitForTableRow('First1');

    expect(document.querySelector('.emp-pagination').querySelectorAll('.emp-pg-btn')[0].disabled).toBe(true); // «
    expect(document.querySelector('.emp-pagination').querySelectorAll('.emp-pg-btn')[1].disabled).toBe(true); // ‹

    const page3Btn = Array.from(document.querySelectorAll('.emp-pg-btn')).find(b => b.textContent === '3');
    fireEvent.click(page3Btn);
    await waitForTableRow('First21');

    const btns = document.querySelector('.emp-pagination').querySelectorAll('.emp-pg-btn');
    expect(btns[btns.length - 1].disabled).toBe(true); // »
    expect(btns[btns.length - 2].disabled).toBe(true); // ›
  });

  it('changing the page size re-fetches from page 1 with the new limit', async () => {
    renderEmployees();
    await waitForTableRow('First1');

    fireEvent.change(document.querySelector('.emp-page-size-select'), { target: { value: '25' } });

    await waitFor(() => expect(lastEmployeesCallParams().limit).toBe(25));
    expect(lastEmployeesCallParams().page).toBe(1);
  });
});
