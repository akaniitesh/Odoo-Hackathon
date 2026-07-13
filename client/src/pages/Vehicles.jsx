import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Plus, Search, Filter, X, Trash2, Edit } from 'lucide-react';

export default function Vehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Add / Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  // Form fields
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [nameModel, setNameModel] = useState('');
  const [type, setType] = useState('Van');
  const [maxLoadCapacityKg, setMaxLoadCapacityKg] = useState('');
  const [odometerKm, setOdometerKm] = useState('');
  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [status, setStatus] = useState('Available');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vehicles');
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (err) {
      console.error('Failed to load vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setRegistrationNumber('');
    setNameModel('');
    setType('Van');
    setMaxLoadCapacityKg('');
    setOdometerKm('');
    setAcquisitionCost('');
    setStatus('Available');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vehicle) => {
    setIsEditMode(true);
    setCurrentId(vehicle._id);
    setRegistrationNumber(vehicle.registrationNumber);
    setNameModel(vehicle.nameModel);
    setType(vehicle.type);
    setMaxLoadCapacityKg(vehicle.maxLoadCapacityKg);
    setOdometerKm(vehicle.odometerKm);
    setAcquisitionCost(vehicle.acquisitionCost);
    setStatus(vehicle.status);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to retire/delete this vehicle record?')) return;
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchVehicles();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete vehicle.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const body = {
      registrationNumber,
      nameModel,
      type,
      maxLoadCapacityKg: parseFloat(maxLoadCapacityKg),
      odometerKm: parseFloat(odometerKm),
      acquisitionCost: parseFloat(acquisitionCost),
      status
    };

    try {
      const url = isEditMode ? `/api/vehicles/${currentId}` : '/api/vehicles';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        fetchVehicles();
      } else {
        setFormError(data.error || 'Failed to submit vehicle details.');
      }
    } catch (err) {
      setFormError('Server connection error.');
    }
  };

  // Perform search & filters client-side
  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = 
      v.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.nameModel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? v.status === statusFilter : true;
    const matchesType = typeFilter ? v.type === typeFilter : true;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusClass = (vStatus) => {
    switch (vStatus) {
      case 'Available': return 'badge-available';
      case 'On Trip': return 'badge-on-trip';
      case 'In Shop': return 'badge-in-shop';
      case 'Retired': return 'badge-retired';
      default: return 'badge-draft';
    }
  };

  const isFleetManager = user?.role === 'FleetManager';

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <h1>Vehicle Registry</h1>
          <p>Monitor status, loads, odometers, and configurations for all fleet vehicles.</p>
        </div>
        {isFleetManager && (
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} />
            Add Vehicle
          </button>
        )}
      </div>

      {/* Search and Filters bar */}
      <div className="card-panel" style={{ padding: '16px 24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '280px' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search Model, Registration..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        </div>
        
        <select 
          className="form-control" 
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ width: '160px' }}
        >
          <option value="">All Types</option>
          <option value="Van">Van</option>
          <option value="Truck">Truck</option>
          <option value="Mini">Mini</option>
        </select>

        <select 
          className="form-control" 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: '160px' }}
        >
          <option value="">All Statuses</option>
          <option value="Available">Available</option>
          <option value="On Trip">On Trip</option>
          <option value="In Shop">In Shop</option>
          <option value="Retired">Retired</option>
        </select>
      </div>

      {/* Vehicles Table */}
      {loading ? (
        <div style={{ display: 'flex', height: '30vh', alignItems: 'center', justifyContent: 'center' }}>
          <div className="pulse-dot"></div>
          <span style={{ color: '#94a3b8' }}>Loading registry...</span>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Registration No.</th>
                <th>Name / Code</th>
                <th>Type</th>
                <th>Max Capacity</th>
                <th>Odometer</th>
                <th>Acquisition Cost</th>
                <th>Status</th>
                {isFleetManager && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map(vehicle => (
                  <tr key={vehicle._id}>
                    <td style={{ fontWeight: 600, color: '#f8fafc', fontFamily: 'Space Grotesk' }}>
                      {vehicle.registrationNumber}
                    </td>
                    <td>{vehicle.nameModel}</td>
                    <td>{vehicle.type}</td>
                    <td>{vehicle.maxLoadCapacityKg.toLocaleString()} kg</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{vehicle.odometerKm.toLocaleString()} km</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>₹{vehicle.acquisitionCost.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${getStatusClass(vehicle.status)}`}>
                        {vehicle.status}
                      </span>
                    </td>
                    {isFleetManager && (
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-secondary btn-icon" 
                            title="Edit"
                            onClick={() => handleOpenEditModal(vehicle)}
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            className="btn btn-danger btn-icon" 
                            title="Retire"
                            onClick={() => handleDelete(vehicle._id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isFleetManager ? 8 : 7} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    {vehicles.length === 0 ? "No vehicles yet — add your first one." : "No vehicles found matching criteria."}
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
              <h3>{isEditMode ? 'Modify Vehicle Details' : 'Register New Vehicle'}</h3>
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
                  <label>Registration Number (Unique)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. GJ01AB4521" 
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    disabled={isEditMode}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Model Short Code (e.g. VAN-05)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. VAN-05" 
                    value={nameModel}
                    onChange={(e) => setNameModel(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Vehicle Type</label>
                    <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="Van">Van</option>
                      <option value="Truck">Truck</option>
                      <option value="Mini">Mini</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Max Load Capacity (kg)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="e.g. 500" 
                      value={maxLoadCapacityKg}
                      onChange={(e) => setMaxLoadCapacityKg(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Odometer Reading (km)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="e.g. 74000" 
                      value={odometerKm}
                      onChange={(e) => setOdometerKm(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Acquisition Cost (₹)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="e.g. 620000" 
                      value={acquisitionCost}
                      onChange={(e) => setAcquisitionCost(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {isEditMode && (
                  <div className="form-group">
                    <label>Asset Status</label>
                    <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="Available">Available</option>
                      <option value="On Trip">On Trip</option>
                      <option value="In Shop">In Shop</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditMode ? 'Save Changes' : 'Register Asset'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
