import React, { createContext, useContext, useState, useEffect } from 'react';

const SupabaseAuthContext = createContext();

export const SupabaseAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check session on mount
  useEffect(() => {
    try {
      const token = localStorage.getItem('sb_token');
      if (token) {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setUser({ email: decoded.sub });
        setRole('admin');
      }
    } catch (err) {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/functions/authSignIn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Sign in failed');
      
      localStorage.setItem('sb_token', data.token);
      setUser({ email });
      setRole('admin');
      return { success: true };
    } catch (err) {
      const msg = err.message || 'Sign in failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/functions/authSignUp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Sign up failed');
      
      return { success: true, message: 'Account created—you can now sign in' };
    } catch (err) {
      const msg = err.message || 'Sign up failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('sb_token');
      localStorage.removeItem('sb_refresh_token');
      setUser(null);
      setRole(null);
    } catch (err) {
      console.error('Sign out failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    return { success: false, error: 'Not implemented' };
  };

  const value = {
    user,
    role,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateUserRole,
    isAuthenticated: !!user,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  }
  return context;
};