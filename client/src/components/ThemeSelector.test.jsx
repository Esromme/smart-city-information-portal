import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

function stubMatchMedia(matches) {
  const mql = {
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };
  vi.stubGlobal('matchMedia', vi.fn(() => mql));
  return mql;
}

let ThemeSelector;

beforeEach(async () => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-theme-preference');
  stubMatchMedia(false);
  vi.resetModules();
  ({ default: ThemeSelector } = await import('./ThemeSelector.jsx'));
});

describe('ThemeSelector', () => {
  it('renders an accessible control for each appearance option', () => {
    render(<ThemeSelector />);

    const group = screen.getByRole('group', { name: /colour theme/i });
    expect(group).toBeInTheDocument();

    ['Light', 'Dark', 'System'].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('marks the current preference as pressed', () => {
    render(<ThemeSelector />);

    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('applies and persists the dark theme when selected', () => {
    render(<ThemeSelector />);

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('kombolcha-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('applies the light theme when selected', () => {
    render(<ThemeSelector />);

    fireEvent.click(screen.getByRole('button', { name: 'Light' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('kombolcha-theme')).toBe('light');
  });

  it('switches back to following the system theme', () => {
    render(<ThemeSelector />);

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: 'System' }));

    expect(window.localStorage.getItem('kombolcha-theme')).toBe('system');
    // The stubbed OS preference is light.
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
