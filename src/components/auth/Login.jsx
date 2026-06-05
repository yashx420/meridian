import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const { signIn, signUp } = useSupabaseAuth();

  // Show resend button after 30 seconds
  useEffect(() => {
    if (!confirmationSent) return;
    const timer = setTimeout(() => setShowResend(true), 30000);
    return () => clearTimeout(timer);
  }, [confirmationSent]);

  const handleResendEmail = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(`${supabaseUrl}/auth/v1/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ email, type: 'signup' }),
      });
      if (response.ok) {
        setResendMessage('Email resent');
        setTimeout(() => setResendMessage(''), 3000);
      } else {
        console.error('Resend failed:', await response.text());
      }
    } catch (err) {
      console.error('Resend failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResendMessage('');
    setShowResend(false);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        const result = await signUp(email, password);
        if (result.success) {
          setConfirmationSent(true);
          setPassword('');
          setConfirmPassword('');
        } else {
          setError(result.error || 'Sign up failed');
        }
      } else {
        const result = await signIn(email, password);
        if (result.success) {
          window.location.href = '/?verified=true';
        } else {
          // Check if error is about unverified email
          const errorMsg = result.error || '';
          if (errorMsg.includes('Email not confirmed') || errorMsg.includes('email_not_confirmed')) {
            setError('Please verify your email before signing in. Check your inbox for the verification link.');
          } else {
            setError(errorMsg || 'Sign in failed');
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAFAF8'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        padding: '32px 24px',
        background: '#FFFFFF',
        border: '1px solid #EFEDE8',
        borderRadius: '14px',
        boxShadow: '0 2px 8px rgba(20,18,12,0.04)'
      }}>
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 16 }}>
            <circle cx="12" cy="12" r="9" stroke="#1A1A1A" strokeWidth="1.4" />
            <circle cx="12" cy="12" r="4" stroke="#4F46E5" strokeWidth="1.4" />
            <circle cx="12" cy="12" r="1.6" fill="#4F46E5" />
          </svg>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
            {isSignUp ? 'Create Account' : 'Welcome to Meridian'}
          </h1>
          <p style={{ fontSize: 13.5, color: '#5C5A55' }}>
            {isSignUp ? 'Sign up to get started' : 'Sign in to your account'}
          </p>
        </div>

        {confirmationSent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: 40, 
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'center'
            }}>✉️</div>
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#1A1A1A',
              marginBottom: 12
            }}>Check your email</div>
            <div style={{
              fontSize: 13.5,
              color: '#5C5A55',
              lineHeight: 1.7,
              marginBottom: 3
            }}>
              We've sent a verification link to <b>{email}</b>.
            </div>
            <div style={{
              fontSize: 13.5,
              color: '#5C5A55',
              lineHeight: 1.7,
              marginBottom: 3
            }}>
              Click the link in the email to activate your account.
            </div>
            <div style={{
              fontSize: 13.5,
              color: '#5C5A55',
              lineHeight: 1.7,
              marginBottom: 20
            }}>
              Once verified, come back here to sign in.
            </div>

            {showResend && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #EFEDE8' }}>
                <button
                  onClick={handleResendEmail}
                  disabled={loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 13,
                    color: '#4F46E5',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    textDecoration: 'underline',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  Resend verification email
                </button>
                {resendMessage && (
                  <div style={{
                    marginTop: 12,
                    fontSize: 12.5,
                    color: '#15803d',
                    fontWeight: 600
                  }}>
                    ✓ {resendMessage}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setConfirmationSent(false);
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setIsSignUp(false);
                setShowResend(false);
                setResendMessage('');
              }}
              style={{
                marginTop: 20,
                background: 'none',
                border: 'none',
                fontSize: 13,
                color: '#4F46E5',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textDecoration: 'underline'
              }}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                padding: '10px 14px',
                border: '1px solid #E6E3DC',
                borderRadius: '10px',
                fontSize: 13.5,
                fontFamily: 'inherit',
                outline: 'none'
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                padding: '10px 14px',
                border: '1px solid #E6E3DC',
                borderRadius: '10px',
                fontSize: 13.5,
                fontFamily: 'inherit',
                outline: 'none'
              }}
            />
            {isSignUp && (
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  padding: '10px 14px',
                  border: '1px solid #E6E3DC',
                  borderRadius: '10px',
                  fontSize: 13.5,
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
              />
            )}

            {error && (
              <div style={{
                padding: '10px 12px',
                background: 'rgba(220,80,80,0.12)',
                border: '1px solid rgba(220,80,80,0.2)',
                borderRadius: 8,
                fontSize: 12,
                color: '#c14a4a'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 16px',
                background: '#4F46E5',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                fontFamily: 'inherit'
              }}
            >
              {loading ? 'Loading…' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>
        )}

        {!confirmationSent && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 13,
                color: '#4F46E5',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textDecoration: 'underline'
              }}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}