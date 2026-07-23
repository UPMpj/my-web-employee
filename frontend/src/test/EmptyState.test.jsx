import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from '../components/EmptyState';

describe('EmptyState', () => {
  it('falls back to the default Lao title when none is given', () => {
    render(<EmptyState />);
    expect(screen.getByText('ບໍ່ມີຂໍ້ມູນ')).toBeTruthy();
  });

  it('renders a custom title and message', () => {
    render(<EmptyState title="Nothing here" message="Try another filter" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
    expect(screen.getByText('Try another filter')).toBeTruthy();
  });

  it('renders the action slot when provided', () => {
    render(<EmptyState title="Empty" action={<button>Retry</button>} />);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('does not render a message paragraph when none is given', () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelector('.es-msg')).toBeNull();
  });
});
