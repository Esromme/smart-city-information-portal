import { useCallback, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import Icon from './Icon.jsx';
import SmartCityLogo from './SmartCityLogo.jsx';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const validate = useCallback(() => {
    const issues = {};
    const trimmed = email.trim();

    if (!trimmed) {
      issues.email = 'Enter your email address.';
    } else if (!EMAIL_PATTERN.test(trimmed)) {
      issues.email = 'Enter a valid email address.';
    }

    if (!password) {
      issues.password = 'Enter your password.';
    }

    return issues;
  }, [email, password]);

  function clearFieldError(field) {
    setFieldErrors((current) => {
      if (!current[field]) return current;

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Ignore extra submits while a request is already in flight.
    if (loading) return;

    setError('');

    const issues = validate();
    setFieldErrors(issues);

    if (Object.keys(issues).length > 0) {
      (issues.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setLoading(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        throw loginError;
      }

      if (!data?.session) {
        throw new Error('Login succeeded, but no session was returned.');
      }

      onLogin?.(data.session);
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card admin-login">
      <header className="admin-login__head">
        <SmartCityLogo size={52} showWordmark />
        <h2>Administrator Sign In</h2>
        <p>Sign in to manage city services and updates.</p>
      </header>

      <form onSubmit={handleSubmit} noValidate aria-busy={loading}>
        <div className="auth-field">
          <label className="field-label" htmlFor="admin-email">
            Email
          </label>
          <div className={`auth-control${fieldErrors.email ? ' has-error' : ''}`}>
            <Icon name="mail" size={18} className="auth-control__icon" />
            <input
              id="admin-email"
              ref={emailRef}
              className="auth-input"
              type="email"
              name="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearFieldError('email');
              }}
              placeholder="you@example.com"
              disabled={loading}
              required
              aria-invalid={fieldErrors.email ? 'true' : undefined}
              aria-describedby={fieldErrors.email ? 'admin-email-error' : undefined}
            />
          </div>
          {fieldErrors.email && (
            <p className="field-error" id="admin-email-error" role="alert">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="auth-field">
          <label className="field-label" htmlFor="admin-password">
            Password
          </label>
          <div className={`auth-control${fieldErrors.password ? ' has-error' : ''}`}>
            <Icon name="lock" size={18} className="auth-control__icon" />
            <input
              id="admin-password"
              ref={passwordRef}
              className="auth-input auth-input--toggle"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearFieldError('password');
              }}
              placeholder="Enter your password"
              disabled={loading}
              required
              aria-invalid={fieldErrors.password ? 'true' : undefined}
              aria-describedby={fieldErrors.password ? 'admin-password-error' : undefined}
            />
            <button
              type="button"
              className="auth-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              disabled={loading}
            >
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
            </button>
          </div>
          {fieldErrors.password && (
            <p className="field-error" id="admin-password-error" role="alert">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <Icon name="warning" size={18} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="btn primary auth-submit"
          disabled={loading}
        >
          {loading && <span className="auth-spinner" aria-hidden="true" />}
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </section>
  );
}
