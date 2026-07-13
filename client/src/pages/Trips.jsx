import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Plus, Check, Play, AlertCircle, Calendar, ShieldAlert, ArrowRight, X } from 'lucide-react';

export default function Trips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState('board'); // 'board' or 'create'

  // Complete Trip Modal
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  
  // Completion form fields
  const [closingOdometer, setClosingOdometer] = useState('');
  const [fuelConsumed, setFuelConsumed] = useState('');
  const [revenue, setRevenue] = useState('');
  const [toll, setToll] = useState('');
  const [otherExpense, setOtherExpense] = useState('');
  const [completionError, setCompletionError] = useState('');

  // Create Trip form fields
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [plannedDistance, setPlannedDistance] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  useEffect(() => {
    fetchTripsData();
  }, []);

  const fetchTripsData = async () => {
    setLoading(true);
    try {
      const [tripsRes, vehiclesRes, driversRes] = await Promise.all([
        fetch('/api/trips'),
        fetch('/api/vehicles'),
        fetch('/api/drivers')
      ]);

      if (tripsRes.ok && vehiclesRes.ok && driversRes.ok) {
        const tData = await tripsRes.json();
        const vData = await vehiclesRes.json();
        const dData = await driversRes.json();
        setTrips(tData);
        setVehicles(vData);
        setDrivers(dData);
      }
    } catch (err) {
      console.error('Error fetching trips context:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter available items for dispatch dropdowns
  const availableVehicles = vehicles.filter(v => v.status === 'Available');
  const availableDrivers = drivers.filter(d => {
    const activeLicense = new Date(d.licenseExpiryDate) > new Date();
    return d.status === 'Available' && activeLicense;
  });

  // Fetch current vehicle specs for live capacity check
  const selectedVehicle = vehicles.find(v => v._id === selectedVehicleId);
  const weightError = selectedVehicle && cargoWeight && parseFloat(cargoWeight) > selectedVehicle.maxLoadCapacityKg;

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    if (weightError) {
      setCreateError('Cannot create trip: Cargo weight exceeds vehicle load limit.');
      return;
    }

    const body = {
      source,
      destination,
      vehicleId: selectedVehicleId,
      driverId: selectedDriverId,
      cargoWeightKg: parseFloat(cargoWeight),
      plannedDistanceKm: parseFloat(plannedDistance)
    };

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setCreateSuccess(`Trip ${data.tripCode} created in Draft status!`);
        // Reset form
        setSource('');
        setDestination('');
        setSelectedVehicleId('');
        setSelectedDriverId('');
        setCargoWeight('');
        setPlannedDistance('');
        fetchTripsData();
        // Switch back to board after a brief delay
        setTimeout(() => {
          setActiveTab('board');
          setCreateSuccess('');
        }, 1500);
      } else {
        setCreateError(data.error || 'Failed to create trip.');
      }
    } catch (err) {
      setCreateError('Connection error.');
    }
  };

  const handleDispatch = async (tripId) => {
    try {
      const res = await fetch(`/api/trips/${tripId}/dispatch`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        fetchTripsData();
      } else {
        alert(data.error || 'Failed to dispatch trip.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async (tripId) => {
    if (!window.confirm('Are you sure you want to cancel this trip dispatch?')) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        fetchTripsData();
      } else {
        alert(data.error || 'Failed to cancel trip.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCompleteModal = (trip) => {
    setSelectedTrip(trip);
    setClosingOdometer(trip.vehicleId?.odometerKm || '');
    setFuelConsumed('');
    setRevenue('');
    setToll('');
    setOtherExpense('');
    setCompletionError('');
    setIsCompleteModalOpen(true);
  };

  const handleCompleteTripSubmit = async (e) => {
    e.preventDefault();
    setCompletionError('');

    const currentOdometer = selectedTrip.vehicleId?.odometerKm || 0;
    if (parseFloat(closingOdometer) < currentOdometer) {
      setCompletionError(`Closing odometer cannot be less than current odometer (${currentOdometer} km).`);
      return;
    }

    const body = {
      closingOdometerKm: parseFloat(closingOdometer),
      fuelConsumedLiters: parseFloat(fuelConsumed),
      revenue: parseFloat(revenue),
      toll: toll ? parseFloat(toll) : 0,
      other: otherExpense ? parseFloat(otherExpense) : 0
    };

    try {
      const res = await fetch(`/api/trips/${selectedTrip._id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setIsCompleteModalOpen(false);
        fetchTripsData();
      } else {
        setCompletionError(data.error || 'Failed to complete trip.');
      }
    } catch (err) {
      setCompletionError('Connection error.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Draft': return <span className="badge badge-draft">Draft</span>;
      case 'Dispatched': return <span className="badge badge-dispatched"><span className="pulse-dot" style={{ margin: '0 6px 0 0', width: '6px', height: '6px' }} />Dispatched</span>;
      case 'Completed': return <span className="badge badge-completed">Completed</span>;
      case 'Cancelled': return <span className="badge badge-retired">Cancelled</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const isDispatcher = user?.role === 'Dispatcher';

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <h1>Trip Dispatcher</h1>
          <p>Create dispatches, assign vehicles & drivers, and record trip outcomes.</p>
        </div>
        {isDispatcher && (
          <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
            <button 
              className={`btn ${activeTab === 'board' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('board')}
            >
              Trips Board
            </button>
            <button 
              className={`btn ${activeTab === 'create' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('create')}
              style={{ marginLeft: '8px' }}
            >
              <Plus size={16} />
              Create Trip
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', height: '40vh', alignItems: 'center', justifyContent: 'center' }}>
          <div className="pulse-dot"></div>
          <span style={{ color: '#94a3b8' }}>Loading dispatch queue...</span>
        </div>
      ) : activeTab === 'board' ? (
        /* Trips board view */
        <div>
          {/* Active Dispatches Grid */}
          <div style={{ marginBottom: '24px', fontSize: '18px', fontWeight: 600, color: '#f59e0b', fontFamily: 'Space Grotesk' }}>
            Active & Pending Dispatches
          </div>
          <div className="trips-board">
            {trips.length > 0 ? (
              trips.map(trip => (
                <div key={trip._id} className="trip-card">
                  <div className="trip-card-header">
                    <span className="trip-card-code">{trip.tripCode}</span>
                    {getStatusBadge(trip.status)}
                  </div>

                  <div className="trip-route">
                    <div className="route-node">
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Source</div>
                      <div>{trip.source}</div>
                    </div>
                    <div className="route-node destination">
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Destination</div>
                      <div>{trip.destination}</div>
                    </div>
                  </div>

                  <div className="trip-details">
                    <div>
                      <div className="detail-item-label">Vehicle</div>
                      <div className="detail-item-value">{trip.vehicleId?.nameModel || 'Unassigned'}</div>
                    </div>
                    <div>
                      <div className="detail-item-label">Driver</div>
                      <div className="detail-item-value">{trip.driverId?.name || 'Unassigned'}</div>
                    </div>
                    <div>
                      <div className="detail-item-label">Cargo Weight</div>
                      <div className="detail-item-value">{trip.cargoWeightKg.toLocaleString()} kg</div>
                    </div>
                    <div>
                      <div className="detail-item-label">Est. Distance</div>
                      <div className="detail-item-value">{trip.plannedDistanceKm} km</div>
                    </div>
                  </div>

                  {trip.status === 'Completed' && (
                    <div style={{ fontSize: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', color: '#10b981', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <div className="detail-item-label">Fuel Used</div>
                        <div style={{ fontWeight: 600 }}>{trip.fuelConsumedLiters} Liters</div>
                      </div>
                      <div>
                        <div className="detail-item-label">Revenue Billed</div>
                        <div style={{ fontWeight: 600 }}>₹{trip.revenue?.toLocaleString()}</div>
                      </div>
                    </div>
                  )}

                  {isDispatcher && (
                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: 'auto' }}>
                      {trip.status === 'Draft' && (
                        <button 
                          className="btn btn-primary" 
                          style={{ flex: 1, padding: '8px 12px', fontSize: '12px' }}
                          onClick={() => handleDispatch(trip._id)}
                        >
                          <Play size={12} />
                          Dispatch Trip
                        </button>
                      )}
                      {trip.status === 'Dispatched' && (
                        <>
                          <button 
                            className="btn btn-primary" 
                            style={{ flex: 1, padding: '8px 12px', fontSize: '12px', backgroundColor: '#10b981' }}
                            onClick={() => handleOpenCompleteModal(trip)}
                          >
                            <Check size={12} />
                            Complete
                          </button>
                          <button 
                            className="btn btn-danger btn-icon" 
                            onClick={() => handleCancel(trip._id)}
                            title="Abort Trip"
                          >
                            <X size={14} />
                          </button>
                        </>
                      )}
                      {trip.status === 'Cancelled' && (
                        <div style={{ fontSize: '11px', color: '#ef4444', textAlign: 'center', width: '100%', fontStyle: 'italic' }}>
                          This dispatch was cancelled.
                        </div>
                      )}
                      {trip.status === 'Completed' && (
                        <div style={{ fontSize: '11px', color: '#10b981', textAlign: 'center', width: '100%', fontStyle: 'italic' }}>
                          Trip completed successfully.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px', color: '#94a3b8', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                No trips yet — plan your first trip.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Create trip view */
        <div className="card-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="panel-title">Plan & Prepare Dispatch Order</div>
          
          {createError && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '6px', padding: '10px 14px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
              {createError}
            </div>
          )}

          {createSuccess && (
            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '6px', padding: '10px 14px', color: '#10b981', fontSize: '13px', marginBottom: '16px' }}>
              {createSuccess}
            </div>
          )}

          <form onSubmit={handleCreateTrip}>
            <div className="form-group">
              <label>Source / Depot Depot Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Gandhinagar Depot" 
                value={source}
                onChange={(e) => setSource(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Destination Hub Address</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Ahmedabad Hub" 
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Select Available Vehicle</label>
                <select 
                  className="form-control" 
                  value={selectedVehicleId} 
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Vehicle --</option>
                  {availableVehicles.map(v => (
                    <option key={v._id} value={v._id}>
                      {v.nameModel} ({v.type} - Max Cap: {v.maxLoadCapacityKg}kg)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Select Available Operator</label>
                <select 
                  className="form-control" 
                  value={selectedDriverId} 
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Driver --</option>
                  {availableDrivers.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.licenseCategory})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Cargo Weight (kg)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="e.g. 450" 
                  value={cargoWeight}
                  onChange={(e) => setCargoWeight(e.target.value)}
                  required
                />
                
                {selectedVehicle && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px', color: weightError ? '#ef4444' : '#94a3b8' }}>
                    <span>Selected Vehicle Max Capacity:</span>
                    <span style={{ fontWeight: 600 }}>{selectedVehicle.maxLoadCapacityKg} kg</span>
                  </div>
                )}
                {weightError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                    <AlertCircle size={12} />
                    <span>Warning: Cargo exceeds vehicle capacity limit!</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Planned Route Distance (km)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="e.g. 32" 
                  value={plannedDistance}
                  onChange={(e) => setPlannedDistance(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '16px' }}
              disabled={weightError || !selectedVehicleId || !selectedDriverId}
            >
              Draft Dispatch Order
            </button>
          </form>
        </div>
      )}

      {/* Completion Modal */}
      {isCompleteModalOpen && selectedTrip && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Close & Complete Trip {selectedTrip.tripCode}</h3>
              <button className="modal-close" onClick={() => setIsCompleteModalOpen(false)}><X size={18} /></button>
            </div>
            
            <form onSubmit={handleCompleteTripSubmit}>
              <div className="modal-body">
                {completionError && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '6px', padding: '10px 14px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
                    {completionError}
                  </div>
                )}

                <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', backgroundColor: 'var(--bg-primary)', padding: '12px', borderRadius: '8px' }}>
                  <strong>Route:</strong> {selectedTrip.source} <ArrowRight size={12} style={{ display: 'inline', margin: '0 4px' }} /> {selectedTrip.destination} <br />
                  <strong>Vehicle:</strong> {selectedTrip.vehicleId?.nameModel} (Current Odo: {selectedTrip.vehicleId?.odometerKm} km) <br />
                  <strong>Driver:</strong> {selectedTrip.driverId?.name}
                </div>

                <div className="form-group">
                  <label>Closing Odometer Reading (km)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 74032" 
                    value={closingOdometer}
                    onChange={(e) => setClosingOdometer(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Fuel Consumed (Liters)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 15" 
                    value={fuelConsumed}
                    onChange={(e) => setFuelConsumed(e.target.value)}
                    required
                  />
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    Calculates efficiency. Seeks average ₹95/L fuel log write-in.
                  </div>
                </div>

                <div className="form-group">
                  <label>Revenue Billed (₹)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 3500" 
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Toll Fees (₹) - Optional</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="e.g. 120" 
                      value={toll}
                      onChange={(e) => setToll(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Other Expenses (₹) - Optional</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder="e.g. 50" 
                      value={otherExpense}
                      onChange={(e) => setOtherExpense(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCompleteModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#10b981' }}>Complete Dispatch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
