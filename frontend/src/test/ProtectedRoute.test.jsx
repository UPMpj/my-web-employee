import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects to /login when there is no session flag', () => {
    renderGuarded();
    expect(screen.getByText('Login Page')).toBeTruthy();
    expect(screen.queryByText('Dashboard Page')).toBeNull();
  });

  it('renders the protected route when a session flag is present', () => {
    localStorage.setItem('user', JSON.stringify({ username: 'admin' }));
    renderGuarded();
    expect(screen.getByText('Dashboard Page')).toBeTruthy();
  });
});
