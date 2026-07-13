import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Compass, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../App';

export default function Signup() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Dispatcher'); // Default to a non-admin role
  
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [clientId, setClientId] = useState('');
  const [showMockGoogle, setShowMockGoogle] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
  }, [role]); // Recreate callback closure when role changes

  const initializeGoogle = (gClientId) => {
    if (window.google) {
      const container = document.getElementById('google-signup-btn');
      if (container) {
        container.innerHTML = '';
      }
      window.google.accounts.id.initialize({
        client_id: gClientId,
        callback: handleGoogleCallback
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-signup-btn'),
        { theme: 'outline', size: 'large', width: '100%', text: 'signup_with' }
      );
    }
  };

  const handleGoogleCallback = async (response) => {
    setErrors({});
    setGeneralError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential, role })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message);
        
        // Clear fields on success
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');

        // If the account was auto-approved immediately (first user)
        const isApproved = data.user && data.user.accountStatus === 'Active';
        if (isApproved) {
          await refreshUser();
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          // If pending approval, redirect to login after a brief delay
          setTimeout(() => {
            navigate('/login');
          }, 4000);
        }
      } else {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setGeneralError(data.error || 'Registration failed. Please check your inputs.');
        }
      }
    } catch (err) {
      setGeneralError('Connection error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword, role })
      });

      const data = await res.json();
      if (res.status === 201) {
        setSuccessMessage(data.message);
        // Clear fields on success
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setRole('Dispatcher');
        
        setTimeout(() => {
          navigate('/login');
        }, 4000);
      } else {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setGeneralError(data.error || 'Registration failed. Please check your inputs.');
        }
      }
    } catch (err) {
      setGeneralError('Connection error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left dark panel - exactly same layout as Login to maintain brand consistency */}
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

      {/* Right sign up form */}
      <div className="login-right">
        <div className="login-form-card" style={{ maxWidth: '440px' }}>
          <h2>Create your account</h2>
          <p>Register a new operator profile on the TransitOps console</p>

          {generalError && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px 16px', color: '#ef4444', fontSize: '13px', marginBottom: '20px' }}>
              {generalError}
            </div>
          )}

          {successMessage && (
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', padding: '12px 16px', color: '#10b981', fontSize: '13px', marginBottom: '20px' }}>
              {successMessage}
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#a7f3d0' }}>
                Redirecting...
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Raj Patel" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ borderColor: errors.name ? '#ef4444' : '' }}
                required
              />
              {errors.name && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                className="form-control" 
                placeholder="email@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ borderColor: errors.email ? '#ef4444' : '' }}
                required
              />
              {errors.email && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>{errors.email}</span>}
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    className="form-control" 
                    placeholder="Min 8 chars" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '40px', borderColor: errors.password ? '#ef4444' : '' }}
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
                {errors.password && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>{errors.password}</span>}
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    className="form-control" 
                    placeholder="Re-enter" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', paddingRight: '40px', borderColor: errors.confirmPassword ? '#ef4444' : '' }}
                    required
                  />
                  <button
                    type="button"
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>{errors.confirmPassword}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Requested Console Role</label>
              <select 
                className="form-control" 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px', borderColor: errors.role ? '#ef4444' : '' }}
              >
                <option value="FleetManager">Fleet Manager</option>
                <option value="Dispatcher">Dispatcher</option>
                <option value="SafetyOfficer">Safety Officer</option>
                <option value="FinancialAnalyst">Financial Analyst</option>
              </select>
              {errors.role && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>{errors.role}</span>}
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', lineHeight: '1.4' }}>
                Note: The first user registered in the system is automatically approved as Fleet Manager. Subsequent requests require admin activation.
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '8px' }} disabled={loading}>
              {loading ? 'Registering...' : 'Sign Up'}
            </button>

            {(clientId || showMockGoogle) && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0' }}>
                  <hr style={{ flex: 1, borderColor: 'var(--border-color)', opacity: 0.3 }} />
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>or</span>
                  <hr style={{ flex: 1, borderColor: 'var(--border-color)', opacity: 0.3 }} />
                </div>
                {clientId ? (
                  <div id="google-signup-btn" style={{ width: '100%' }}></div>
                ) : (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => handleGoogleCallback({ credential: 'mock-google-token' })}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    <span>Sign Up with Google (Demo)</span>
                  </button>
                )}
              </div>
            )}
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px' }}>
            <span style={{ color: '#94a3b8' }}>Already have an account? </span>
            <Link to="/login" style={{ color: '#f59e0b', fontWeight: 600 }}>Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
