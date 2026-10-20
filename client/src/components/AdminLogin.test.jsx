import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { mockSignIn } = vi.hoisted(() => ({ mockSignIn: vi.fn() }));

vi.mock('../lib/supabase.js', () => ({
  supabase: { auth: { signInWithPassword: mockSignIn } },
}));

const { default: AdminLogin } = await import('./AdminLogin.jsx');

beforeEach(() => {
  mockSignIn.mockReset();
});

function fillForm() {
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'admin@kombolcha.gov.et' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'secret' },
  });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
}

describe('AdminLogin', () => {
  it('calls onLogin with the session on success', async () => {
    const onLogin = vi.fn();
    mockSignIn.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null,
    });

    render(<AdminLogin onLogin={onLogin} />);
    fillForm();

    await waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1));
    expect(onLogin.mock.calls[0][0]).toEqual({ access_token: 'token' });
  });

  it('shows an error message when sign in fails', async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });

    render(<AdminLogin onLogin={vi.fn()} />);
    fillForm();

    expect(
      await screen.findByRole('alert')
    ).toHaveTextContent('Invalid login credentials');
  });

  it('renders the portal branding and supporting copy', () => {
    render(<AdminLogin onLogin={vi.fn()} />);

    expect(
      screen.getByRole('img', { name: /smart city information portal/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /administrator sign in/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/sign in to manage city services and updates/i)
    ).toBeInTheDocument();
  });

  it('shows accessible validation messages and does not submit an empty form', async () => {
    render(<AdminLogin onLogin={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByText('Enter your email address.')
    ).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('toggles password visibility without changing the value', () => {
    render(<AdminLogin onLogin={vi.fn()} />);

    const password = screen.getByLabelText('Password');
    fireEvent.change(password, { target: { value: 'secret' } });

    expect(password).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: /show password/i }));

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Password')).toHaveValue('secret');

    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('disables the form while a sign-in request is pending', async () => {
    let resolveSignIn;
    mockSignIn.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      })
    );

    render(<AdminLogin onLogin={vi.fn()} />);
    fillForm();

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    expect(screen.getByLabelText('Email')).toBeDisabled();

    resolveSignIn({ data: { session: null }, error: { message: 'nope' } });

    await waitFor(() =>
      expect(screen.getByLabelText('Email')).not.toBeDisabled()
    );
  });
});
