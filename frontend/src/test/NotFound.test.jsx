import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import NotFound from '../pages/main/NotFound';

function renderAt(path) {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>
  );
}

describe('NotFound page', () => {
  it('renders the Lao 404 title and message by default', () => {
    renderAt('/no-such-route');
    expect(screen.getByText('404 — ບໍ່ພົບໜ້ານີ້')).toBeTruthy();
    expect(screen.getByText('ໜ້າທີ່ທ່ານກຳລັງຊອກຫາບໍ່ມີ ຫຼື ຖືກຍ້າຍໄປແລ້ວ')).toBeTruthy();
  });

  it('navigates to /dashboard when the button is clicked', () => {
    renderAt('/no-such-route');
    fireEvent.click(screen.getByText('ກັບໄປໜ້າຫຼັກ'));
    expect(screen.getByText('Dashboard Page')).toBeTruthy();
  });
});
