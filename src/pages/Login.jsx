import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // If already signed in, skip the login screen.
  useEffect(() => {
    base44.auth.isAuthenticated().then((ok) => {
      if (ok) navigate('/', { replace: true });
    });
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      if (mode === 'register') {
        await base44.auth.register(email.trim(), password, fullName.trim() || undefined);
      } else {
        await base44.auth.login(email.trim(), password);
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const isRegister = mode === 'register';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-tint, #f6f5f1)',
        padding: 24,
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          width: 380,
          background: 'var(--surface, #fff)',
          border: '1px solid var(--line-2, #e6e3dc)',
          borderRadius: 16,
          boxShadow: '0 12px 40px rgba(20,18,12,0.10)',
          padding: '32px 30px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#1A1A1A,#3A3A3A)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v6m0 8v6M2 12h6m8 0h6M5 5l4 4m6 6l4 4M5 19l4-4m6-6l4-4" />
            </svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink, #1a1a1a)' }}>Meridian</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3, #777)', marginBottom: 22 }}>
          {isRegister ? 'Create your account' : 'Sign in to the Team Consultation Engine'}
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isRegister && (
            <Field
              label="Full name"
              type="text"
              value={fullName}
              onChange={setFullName}
              placeholder="Jane Consultant"
              autoFocus
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@organisation.com"
            required
            autoFocus={!isRegister}
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            required
          />

          {error && (
            <div style={{ fontSize: 12, color: '#ef4444', lineHeight: 1.4 }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={busy || !email.trim() || !password}
            style={{
              marginTop: 6,
              padding: '10px 14px',
              borderRadius: 9,
              border: 'none',
              background: 'var(--indigo, #4f46e5)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: busy || !email.trim() || !password ? 'default' : 'pointer',
              opacity: busy ? 0.7 : 1,
              fontFamily: 'inherit',
            }}
          >
            {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 18, fontSize: 12, color: 'var(--ink-3, #777)', textAlign: 'center' }}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setMode(isRegister ? 'login' : 'register');
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--indigo, #4f46e5)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'inherit',
              padding: 0,
            }}
          >
            {isRegister ? 'Sign in' : 'Create one'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder, required, autoFocus }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3, #777)' }}>{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: '9px 11px',
          border: '1px solid var(--line-2, #e6e3dc)',
          borderRadius: 8,
          fontSize: 13,
          color: 'var(--ink, #1a1a1a)',
          background: 'var(--bg-tint, #faf9f6)',
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />
    </label>
  );
}
