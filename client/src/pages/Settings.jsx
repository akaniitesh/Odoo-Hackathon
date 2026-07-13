import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Save, ShieldAlert, LogOut, Check, X } from 'lucide-react';

export default function Settings() {
  const { user, logout } = useAuth();
  
  const [depotName, setDepotName] = useState('Gandhinagar Depot');
  const [currency, setCurrency] = useState('₹');
  const [distanceUnit, setDistanceUnit] = useState('km');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Pending signups state
  const [pendingSignups, setPendingSignups] = useState([]);
  const [fetchingSignups, setFetchingSignups] = useState(false);

  const isFleetManager = user?.role === 'FleetManager';

  useEffect(() => {
    fetchSettings();
    if (isFleetManager) {
      fetchPendingSignups();
    }
  }, [isFleetManager]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setDepotName(data.depotName);
        setCurrency(data.currency);
        setDistanceUnit(data.distanceUnit);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingSignups = async () => {
    setFetchingSignups(true);
    try {
      const res = await fetch('/api/auth/pending-signups');
      if (res.ok) {
        const data = await res.json();
        setPendingSignups(data);
      }
    } catch (err) {
      console.error('Failed to load pending signups:', err);
    } finally {
      setFetchingSignups(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const body = { depotName, currency, distanceUnit };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Depot settings updated successfully!');
        setDepotName(data.depotName);
        setCurrency(data.currency);
        setDistanceUnit(data.distanceUnit);
      } else {
        setError(data.error || 'Failed to update settings.');
      }
    } catch (err) {
      setError('Connection error.');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveSignup = async (id) => {
    try {
      const res = await fetch(`/api/auth/approve-signup/${id}`, { method: 'POST' });
      if (res.ok) {
        fetchPendingSignups();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to approve user.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectSignup = async (id) => {
    if (!window.confirm('Are you sure you want to reject this signup request?')) return;
    try {
      const res = await fetch(`/api/auth/reject-signup/${id}`, { method: 'POST' });
      if (res.ok) {
        fetchPendingSignups();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to reject user.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'FleetManager': return 'Fleet Manager';
      case 'Dispatcher': return 'Dispatcher';
      case 'SafetyOfficer': return 'Safety Officer';
      case 'FinancialAnalyst': return 'Financial Analyst';
      default: return role;
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <h1>Settings & RBAC</h1>
          <p>Configure depot parameters, manage account sessions, and inspect security rules.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', height: '30vh', alignItems: 'center', justifyContent: 'center' }}>
          <div className="pulse-dot"></div>
          <span style={{ color: '#94a3b8' }}>Loading config...</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px' }}>
          {/* Left Column: Account Profile & Depot Configs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Account Info Card */}
            <div className="card-panel">
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Account Profile</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '16px 0' }}>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Signed In As</label>
                  <div style={{ fontSize: '15px', color: '#f8fafc', fontWeight: 600, marginTop: '2px' }}>{user?.name}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Email Address</label>
                  <div style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '2px' }}>{user?.email}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Role Scope</label>
                  <div style={{ marginTop: '4px' }}>
                    <span className="user-badge" style={{ fontSize: '12px' }}>{getRoleBadge(user?.role)}</span>
                  </div>
                </div>
              </div>

              <button 
                className="btn btn-secondary" 
                onClick={logout} 
                style={{ width: '100%', borderColor: '#ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>

            {/* Depot Configurations Card */}
            <div className="card-panel">
              <div className="panel-title">Depot Configurations</div>
              
              {message && (
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '6px', padding: '10px 14px', color: '#10b981', fontSize: '13px', marginBottom: '16px' }}>
                  {message}
                </div>
              )}

              {error && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '6px', padding: '10px 14px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label>Depot Node Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={depotName} 
                    onChange={(e) => setDepotName(e.target.value)}
                    disabled={!isFleetManager}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Currency Denomination</label>
                  <select 
                    className="form-control" 
                    value={currency} 
                    onChange={(e) => setCurrency(e.target.value)}
                    disabled={!isFleetManager}
                  >
                    <option value="₹">₹ INR (Indian Rupee)</option>
                    <option value="$">$ USD (US Dollar)</option>
                    <option value="€">€ EUR (Euro)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Distance Unit metric</label>
                  <select 
                    className="form-control" 
                    value={distanceUnit} 
                    onChange={(e) => setDistanceUnit(e.target.value)}
                    disabled={!isFleetManager}
                  >
                    <option value="km">Kilometers (km)</option>
                    <option value="mi">Miles (mi)</option>
                  </select>
                </div>

                {isFleetManager ? (
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}
                    disabled={saving}
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', color: '#94a3b8', fontSize: '12px', marginTop: '16px', border: '1px dashed var(--border-color)', padding: '12px', borderRadius: '8px' }}>
                    <ShieldAlert size={16} style={{ flexShrink: 0, color: '#f59e0b' }} />
                    <span>Only users with Fleet Manager authority profiles can update depot configurations.</span>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Right Column: Pending Signups & RBAC Mapping */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Pending Signups (FleetManager only) */}
            {isFleetManager && (
              <div className="card-panel">
                <div className="panel-title">Pending Signups</div>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.4 }}>
                  New account registration requests awaiting authorization.
                </p>

                {fetchingSignups ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>
                    <span className="pulse-dot" style={{ display: 'inline-block', marginRight: '8px' }} />
                    Loading requests...
                  </div>
                ) : pendingSignups.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {pendingSignups.map(signup => (
                      <div 
                        key={signup._id} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '12px 16px', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '8px', 
                          backgroundColor: 'rgba(30, 41, 59, 0.2)' 
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>{signup.name}</div>
                          <div style={{ color: '#94a3b8', fontSize: '12px' }}>{signup.email}</div>
                          <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '2px', fontWeight: 500 }}>
                            Requested Role: {getRoleBadge(signup.role)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleApproveSignup(signup._id)}
                          >
                            <Check size={12} />
                            Approve
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleRejectSignup(signup._id)}
                          >
                            <X size={12} />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#94a3b8', padding: '24px 12px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                    No pending registration requests.
                  </div>
                )}
              </div>
            )}

            {/* RBAC matrix view */}
            <div className="card-panel">
              <div className="panel-title">Console Role Authorization Mapping (RBAC)</div>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.4 }}>
                This matrix defines the authorization levels for TransitOps features. Feature level access is validated server-side on every request.
              </p>
              
              <div className="table-responsive">
                <table className="custom-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Module Area</th>
                      <th>Fleet Manager</th>
                      <th>Dispatcher</th>
                      <th>Safety Officer</th>
                      <th>Fin. Analyst</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>Dashboard</td>
                      <td><span style={{ color: '#10b981' }}>View</span></td>
                      <td><span style={{ color: '#10b981' }}>View</span></td>
                      <td><span style={{ color: '#10b981' }}>View</span></td>
                      <td><span style={{ color: '#10b981' }}>View</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>Vehicle Registry</td>
                      <td><span style={{ color: '#f59e0b', fontWeight: 600 }}>Full CRUD</span></td>
                      <td><span style={{ color: '#10b981' }}>View</span></td>
                      <td><span style={{ color: '#ef4444' }}>No Access</span></td>
                      <td><span style={{ color: '#10b981' }}>View</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>Drivers & Safety</td>
                      <td><span style={{ color: '#10b981' }}>View</span></td>
                      <td><span style={{ color: '#10b981' }}>View</span></td>
                      <td><span style={{ color: '#f59e0b', fontWeight: 600 }}>Full CRUD</span></td>
                      <td><span style={{ color: '#ef4444' }}>No Access</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>Trip Dispatcher</td>
                      <td><span style={{ color: '#10b981' }}>View</span></td>
                      <td><span style={{ color: '#f59e0b', fontWeight: 600 }}>Full Dispatch</span></td>
                      <td><span style={{ color: '#10b981' }}>View</span></td>
                      <td><span style={{ color: '#ef4444' }}>No Access</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>Maintenance</td>
                      <td><span style={{ color: '#f59e0b', fontWeight: 600 }}>Full CRUD</span></td>
                      <td><span style={{ color: '#ef4444' }}>No Access</span></td>
                      <td><span style={{ color: '#ef4444' }}>No Access</span></td>
                      <td><span style={{ color: '#10b981' }}>View</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>Fuel & Expenses</td>
                      <td><span style={{ color: '#10b981' }}>View</span></td>
                      <td><span style={{ color: '#3b82f6' }}>Refuel Logs Only</span></td>
                      <td><span style={{ color: '#ef4444' }}>No Access</span></td>
                      <td><span style={{ color: '#f59e0b', fontWeight: 600 }}>Full Admin</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>Reports & Analytics</td>
                      <td><span style={{ color: '#10b981' }}>View</span></td>
                      <td><span style={{ color: '#ef4444' }}>No Access</span></td>
                      <td><span style={{ color: '#10b981' }}>View</span></td>
                      <td><span style={{ color: '#f59e0b', fontWeight: 600 }}>Full Admin</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
