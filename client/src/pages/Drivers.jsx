import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Plus, Search, X, Trash2, Edit, AlertTriangle } from 'lucide-react';

export default function Drivers() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseCategory, setLicenseCategory] = useState('LMV');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [safetyScore, setSafetyScore] = useState('');
  const [tripCompletionRate, setTripCompletionRate] = useState('');
  const [status, setStatus] = useState('Available');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/drivers');
      if (res.ok) {
        const data = await res.json();
        setDrivers(data);
      }
    } catch (err) {
      console.error('Failed to load drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setName('');
    setLicenseNumber('');
    setLicenseCategory('LMV');
    setLicenseExpiryDate('');
    setContactNumber('');
    setSafetyScore(100);
    setTripCompletionRate(100);
    setStatus('Available');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (driver) => {
    setIsEditMode(true);
    setCurrentId(driver._id);
    setName(driver.name);
    setLicenseNumber(driver.licenseNumber);
    setLicenseCategory(driver.licenseCategory);
    
    // Format date to YYYY-MM-DD
    const dateStr = driver.licenseExpiryDate 
      ? new Date(driver.licenseExpiryDate).toISOString().split('T')[0]
      : '';
    setLicenseExpiryDate(dateStr);
    
    setContactNumber(driver.contactNumber);
    setSafetyScore(driver.safetyScore);
    setTripCompletionRate(driver.tripCompletionRate);
    setStatus(driver.status);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this driver profile?')) return;
    try {
      const res = await fetch(`/api/drivers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDrivers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete driver.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const body = {
      name,
      licenseNumber,
      licenseCategory,
      licenseExpiryDate,
      contactNumber,
      safetyScore: parseFloat(safetyScore),
      tripCompletionRate: parseFloat(tripCompletionRate),
      status
    };

    try {
      const url = isEditMode ? `/api/drivers/${currentId}` : '/api/drivers';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        fetchDrivers();
      } else {
        setFormError(data.error || 'Failed to submit driver details.');
      }
    } catch (err) {
      setFormError('Server connection error.');
    }
  };

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? d.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const getStatusClass = (dStatus) => {
    switch (dStatus) {
      case 'Available': return 'badge-available';
      case 'On Trip': return 'badge-on-trip';
      case 'Off Duty': return 'badge-off-duty';
      case 'Suspended': return 'badge-suspended';
      default: return 'badge-draft';
    }
  };

  const isExpired = (expiryDate) => {
    return new Date(expiryDate) < new Date();
  };

  const isSafetyOfficer = user?.role === 'SafetyOfficer';

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <h1>Drivers & Safety Profiles</h1>
          <p>Monitor driver statuses, safety scores, and commercial licensing compliance.</p>
        </div>
        {isSafetyOfficer && (
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} />
            Add Driver
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="card-panel" style={{ padding: '16px 24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '280px' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search Driver Name, License..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        </div>

        <select 
          className="form-control" 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: '180px' }}
        >
          <option value="">All Statuses</option>
          <option value="Available">Available</option>
          <option value="On Trip">On Trip</option>
          <option value="Off Duty">Off Duty</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      {/* Drivers Table */}
      {loading ? (
        <div style={{ display: 'flex', height: '30vh', alignItems: 'center', justifyContent: 'center' }}>
          <div className="pulse-dot"></div>
          <span style={{ color: '#94a3b8' }}>Loading driver registry...</span>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Driver Name</th>
                <th>License No.</th>
                <th>Category</th>
                <th>Expiry Date</th>
                <th>Contact</th>
                <th>Trip Completion</th>
                <th>Safety Score</th>
                <th>Status</th>
                {isSafetyOfficer && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.length > 0 ? (
                filteredDrivers.map(driver => {
                  const expired = isExpired(driver.licenseExpiryDate);
                  return (
                    <tr key={driver._id} style={{ backgroundColor: expired ? 'rgba(239, 68, 68, 0.02)' : '' }}>
                      <td style={{ fontWeight: 600, color: '#f8fafc' }}>{driver.name}</td>
                      <td>{driver.licenseNumber}</td>
                      <td>{driver.licenseCategory}</td>
                      <td style={{ color: expired ? '#ef4444' : '' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {expired && <AlertTriangle size={14} style={{ color: '#ef4444' }} />}
                          <span>{new Date(driver.licenseExpiryDate).toLocaleDateString()}</span>
                          {expired && <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>[Expired]</span>}
                        </div>
                      </td>
                      <td>{driver.contactNumber}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{driver.tripCompletionRate}%</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: driver.safetyScore >= 90 ? '#10b981' : driver.safetyScore >= 80 ? '#f59e0b' : '#ef4444' }}>
                        {driver.safetyScore}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(driver.status)}`}>
                          {driver.status}
                        </span>
                      </td>
                      {isSafetyOfficer && (
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn btn-secondary btn-icon" 
                              onClick={() => handleOpenEditModal(driver)}
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              className="btn btn-danger btn-icon" 
                              onClick={() => handleDelete(driver._id)}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isSafetyOfficer ? 9 : 8} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    {drivers.length === 0 ? "No drivers registered yet — add your first one." : "No drivers found matching criteria."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Popup */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isEditMode ? 'Modify Driver Safety Profile' : 'Register Commercial Driver'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '6px', padding: '10px 14px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label>Driver Full Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Alex" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>License Number (Unique)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. DL-88213" 
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>License Category</label>
                    <select className="form-control" value={licenseCategory} onChange={(e) => setLicenseCategory(e.target.value)}>
                      <option value="LMV">LMV (Light Motor)</option>
                      <option value="HMV">HMV (Heavy Motor)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>License Expiry Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={licenseExpiryDate}
                      onChange={(e) => setLicenseExpiryDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Contact Mobile Number</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. +919876543210" 
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Safety Score (0 - 100)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={safetyScore}
                      onChange={(e) => setSafetyScore(e.target.value)}
                      min="0"
                      max="100"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Trip Completion Rate (%)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={tripCompletionRate}
                      onChange={(e) => setTripCompletionRate(e.target.value)}
                      min="0"
                      max="100"
                      required
                    />
                  </div>
                </div>

                {isEditMode && (
                  <div className="form-group">
                    <label>Operator Status</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="Available">Available</option>
                      <option value="On Trip">On Trip</option>
                      <option value="Off Duty">Off Duty</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditMode ? 'Save Changes' : 'Register Operator'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'Available': return 'badge-available';
    case 'On Trip': return 'badge-on-trip';
    case 'Off Duty': return 'badge-off-duty';
    case 'Suspended': return 'badge-suspended';
    default: return 'badge-draft';
  }
};
