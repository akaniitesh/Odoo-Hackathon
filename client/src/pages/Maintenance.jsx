import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Plus, Check, X, Wrench, AlertCircle } from 'lucide-react';

export default function Maintenance() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal / Add Record States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [cost, setCost] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('Active');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  const fetchMaintenanceData = async () => {
    setLoading(true);
    try {
      const [logsRes, vehiclesRes] = await Promise.all([
        fetch('/api/maintenance'),
        fetch('/api/vehicles')
      ]);

      if (logsRes.ok && vehiclesRes.ok) {
        const logsData = await logsRes.json();
        const vehiclesData = await vehiclesRes.json();
        setLogs(logsData);
        setVehicles(vehiclesData);
      }
    } catch (err) {
      console.error('Failed to load maintenance records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setVehicleId('');
    setServiceType('');
    setCost('');
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
    
    setStatus('Active');
    setNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const body = {
      vehicleId,
      serviceType,
      cost: parseFloat(cost),
      date,
      status,
      notes
    };

    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        fetchMaintenanceData();
      } else {
        setFormError(data.error || 'Failed to record maintenance.');
      }
    } catch (err) {
      setFormError('Connection error.');
    }
  };

  const handleCompleteService = async (logId) => {
    if (!window.confirm('Mark this maintenance service record as completed?')) return;
    try {
      const res = await fetch(`/api/maintenance/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' })
      });
      const data = await res.json();
      if (res.ok) {
        fetchMaintenanceData();
      } else {
        alert(data.error || 'Failed to complete maintenance record.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Allow FleetManager to modify/log records
  const isFleetManager = user?.role === 'FleetManager';

  // Vehicles list for dropdown (exclude Retired vehicles)
  const filterDropdownVehicles = vehicles.filter(v => v.status !== 'Retired');

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <h1>Maintenance Logs</h1>
          <p>Schedule servicing, track repair costs, and manage vehicle downtime.</p>
        </div>
        {isFleetManager && (
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} />
            Log Service Record
          </button>
        )}
      </div>

      {/* Maintenance Logs Table */}
      {loading ? (
        <div style={{ display: 'flex', height: '30vh', alignItems: 'center', justifyContent: 'center' }}>
          <div className="pulse-dot"></div>
          <span style={{ color: '#94a3b8' }}>Loading maintenance logs...</span>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Vehicle Model</th>
                <th>Registration No.</th>
                <th>Service Type</th>
                <th>Cost</th>
                <th>Log Date</th>
                <th>Status</th>
                <th>Notes</th>
                {isFleetManager && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map(log => (
                  <tr key={log._id}>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                      {log.vehicleId?.nameModel || 'Unknown Vehicle'}
                    </td>
                    <td>{log.vehicleId?.registrationNumber || 'N/A'}</td>
                    <td>{log.serviceType}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>₹{log.cost.toLocaleString()}</td>
                    <td>{new Date(log.date).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${log.status === 'Active' ? 'badge-in-shop' : 'badge-completed'}`}>
                        {log.status === 'Active' ? 'In Shop (Active)' : 'Completed'}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', maxWidth: '300px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={log.notes}>
                      {log.notes || '-'}
                    </td>
                    {isFleetManager && (
                      <td>
                        {log.status === 'Active' ? (
                          <button 
                            className="btn btn-primary btn-icon" 
                            style={{ backgroundColor: '#10b981' }}
                            title="Complete Service"
                            onClick={() => handleCompleteService(log._id)}
                          >
                            <Check size={14} />
                          </button>
                        ) : (
                          <span style={{ fontStyle: 'italic', fontSize: '12px', color: '#10b981' }}>Closed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isFleetManager ? 8 : 7} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No maintenance logs yet.
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
              <h3>Log Vehicle Servicing Record</h3>
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
                  <label>Select Vehicle (Available or In-Shop)</label>
                  <select 
                    className="form-control" 
                    value={vehicleId} 
                    onChange={(e) => setVehicleId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Vehicle --</option>
                    {filterDropdownVehicles.map(v => (
                      <option key={v._id} value={v._id}>
                        {v.nameModel} ({v.registrationNumber} - Current status: {v.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Service Type / Details</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Oil Change, Tyre Replace, Brake Pads" 
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Estimated Cost (₹)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="e.g. 2500" 
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Servicing Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Log Status</label>
                  <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="Active">Active (Flips Vehicle status to "In Shop")</option>
                    <option value="Completed">Completed (Auto-records Operational Expense)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Additional Notes</label>
                  <textarea 
                    className="form-control" 
                    placeholder="Describe parts replaced or mechanics details..." 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Service Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
