import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';

function Probe() {
  const { lang, t, toggleLang } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="greeting">{t('back')}</span>
      <span data-testid="missing-key">{t('this_key_does_not_exist')}</span>
      <button onClick={toggleLang}>toggle</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>
  );
}

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to Lao when nothing is stored', () => {
    renderProbe();
    expect(screen.getByTestId('lang').textContent).toBe('lo');
    expect(screen.getByTestId('greeting').textContent).toBe('ກັບຄືນ');
  });

  it('restores the language saved in localStorage', () => {
    localStorage.setItem('lang', 'en');
    renderProbe();
    expect(screen.getByTestId('lang').textContent).toBe('en');
    expect(screen.getByTestId('greeting').textContent).toBe('Back');
  });

  it('toggleLang flips between lo and en and persists the choice', () => {
    renderProbe();
    expect(screen.getByTestId('lang').textContent).toBe('lo');

    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('lang').textContent).toBe('en');
    expect(localStorage.getItem('lang')).toBe('en');

    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('lang').textContent).toBe('lo');
    expect(localStorage.getItem('lang')).toBe('lo');
  });

  it('returns the raw key when a translation exists in neither language', () => {
    renderProbe();
    expect(screen.getByTestId('missing-key').textContent).toBe('this_key_does_not_exist');
  });
});
