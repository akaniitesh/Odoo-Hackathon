import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useNavigate, Link } from 'react-router-dom';
import { Compass, Eye, EyeOff } from 'lucide-react';
import { requestJson } from '../services/api';

export default function Login() {
  const { login, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [clientId, setClientId] = useState('');
  const [showMockGoogle, setShowMockGoogle] = useState(false);

  useEffect(() => {
    fetch('/api/auth/google-client-id')
      .then(res => res.json())
      .then(data => {
        if (data.clientId) {
          setClientId(data.clientId);
          
          const interval = setInterval(() => {
            if (window.google) {
              clearInterval(interval);
              initializeGoogle(data.clientId);
            }
          }, 100);
          
          return () => clearInterval(interval);
        } else {
          setShowMockGoogle(true);
        }
      })
      .catch(err => {
        console.error('Error fetching Google client ID:', err);
        setShowMockGoogle(true);
      });
  }, []);

  const initializeGoogle = (gClientId) => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: gClientId,
        callback: handleGoogleCallback
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        { theme: 'outline', size: 'large', width: '100%', text: 'signin_with' }
      );
    }
  };

  const handleGoogleCallback = async (response) => {
    setError('');
    setLoading(true);
    try {
      await requestJson('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken: response.credential })
      });
      await refreshUser();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleMockGoogleAuth = () => {
    handleGoogleCallback({ credential: 'mock-google-token' });
  };

  const handleGuestLogin = async (selectedRole) => {
    setError('');
    setLoading(true);
    try {
      await requestJson('/api/auth/guest', {
        method: 'POST',
        body: JSON.stringify({ role: selectedRole })
      });
      await refreshUser();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Guest login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, rememberMe);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials or connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left dark panel */}
      <div className="login-left">
        <div className="brand-section">
          <div className="brand-icon-wrapper">
            <Compass />
          </div>
          <span className="brand-name">TransitOps</span>
        </div>

        <div className="hero-section">
          <h1>Smart Transport<br />Operations Platform</h1>
          <p>
            Track your fleet lifecycle, optimize dispatch workflows, enforce safety policies, 
            and analyze operational financials in one unified workspace.
          </p>
        </div>

        <div className="login-left-footer">
          &copy; 2026 TransitOps. All rights reserved. Registered trademark.
        </div>
      </div>

      {/* Right sign in form */}
      <div className="login-right">
        <div className="login-form-card">
          <h2>Sign in to your account</h2>
          <p>Enter your credentials to access the console</p>

          {error && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px 16px', color: '#ef4444', fontSize: '13px', marginBottom: '24px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                className="form-control" 
                placeholder="email@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="form-control" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', paddingRight: '40px' }}
                  required
                />
                <button
                  type="button"
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '20px 0 32px 0', fontSize: '13px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  style={{ accentColor: '#f59e0b' }} 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '15px' }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>

            {(clientId || showMockGoogle) && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0' }}>
                  <hr style={{ flex: 1, borderColor: 'var(--border-color)', opacity: 0.3 }} />
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>or</span>
                  <hr style={{ flex: 1, borderColor: 'var(--border-color)', opacity: 0.3 }} />
                </div>
                {clientId ? (
                  <div id="google-signin-btn" style={{ width: '100%' }}></div>
                ) : (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleMockGoogleAuth}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    <span>Sign In with Google (Demo)</span>
                  </button>
                )}
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                <hr style={{ flex: 1, borderColor: 'var(--border-color)', opacity: 0.3 }} />
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>or sign in as guest</span>
                <hr style={{ flex: 1, borderColor: 'var(--border-color)', opacity: 0.3 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => handleGuestLogin('FleetManager')} style={{ padding: '8px 4px', fontSize: '11px' }}>
                  Fleet Manager
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => handleGuestLogin('Dispatcher')} style={{ padding: '8px 4px', fontSize: '11px' }}>
                  Dispatcher
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => handleGuestLogin('SafetyOfficer')} style={{ padding: '8px 4px', fontSize: '11px' }}>
                  Safety Officer
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => handleGuestLogin('FinancialAnalyst')} style={{ padding: '8px 4px', fontSize: '11px' }}>
                  Financial Analyst
                </button>
              </div>
            </div>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px' }}>
            <span style={{ color: '#94a3b8' }}>New here? </span>
            <Link to="/signup" style={{ color: '#f59e0b', fontWeight: 600 }}>Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
