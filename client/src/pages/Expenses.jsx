import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Plus, Coins, Fuel, X } from 'lucide-react';

export default function Expenses() {
  const { user } = useAuth();
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // View tabs
  const [activeTab, setActiveTab] = useState('fuel'); // 'fuel' or 'expenses'

  // Modals
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  // Fuel Form Fields
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedTripId, setSelectedTripId] = useState('');
  const [fuelDate, setFuelDate] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelCost, setFuelCost] = useState('');

  // Expense Form Fields
  const [expVehicleId, setExpVehicleId] = useState('');
  const [expTripId, setExpTripId] = useState('');
  const [expToll, setExpToll] = useState('');
  const [expOther, setExpOther] = useState('');

  useEffect(() => {
    fetchExpensesData();
  }, []);

  const fetchExpensesData = async () => {
    setLoading(true);
    try {
      const [fuelRes, expRes, vehiclesRes, tripsRes] = await Promise.all([
        fetch('/api/expenses/fuel'),
        fetch('/api/expenses'),
        fetch('/api/vehicles'),
        fetch('/api/trips')
      ]);

      if (fuelRes.ok && expRes.ok && vehiclesRes.ok && tripsRes.ok) {
        const fData = await fuelRes.json();
        const eData = await expRes.json();
        const vData = await vehiclesRes.json();
        const tData = await tripsRes.json();

        setFuelLogs(fData);
        setExpenses(eData);
        setVehicles(vData);
        setTrips(tData);
      }
    } catch (err) {
      console.error('Failed to load expenses data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFuelModal = () => {
    setSelectedVehicleId('');
    setSelectedTripId('');
    setFuelDate(new Date().toISOString().split('T')[0]);
    setFuelLiters('');
    setFuelCost('');
    setFormError('');
    setIsFuelModalOpen(true);
  };

  const handleOpenExpenseModal = () => {
    setExpVehicleId('');
    setExpTripId('');
    setExpToll('');
    setExpOther('');
    setFormError('');
    setIsExpenseModalOpen(true);
  };

  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const body = {
      vehicleId: selectedVehicleId,
      tripId: selectedTripId || null,
      date: fuelDate,
      liters: parseFloat(fuelLiters),
      cost: parseFloat(fuelCost)
    };

    try {
      const res = await fetch('/api/expenses/fuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setIsFuelModalOpen(false);
        fetchExpensesData();
      } else {
        setFormError(data.error || 'Failed to log fuel entry.');
      }
    } catch (err) {
      setFormError('Connection error.');
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const body = {
      vehicleId: expVehicleId,
      tripId: expTripId || null,
      toll: expToll ? parseFloat(expToll) : 0,
      other: expOther ? parseFloat(expOther) : 0
    };

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setIsExpenseModalOpen(false);
        fetchExpensesData();
      } else {
        setFormError(data.error || 'Failed to log expense.');
      }
    } catch (err) {
      setFormError('Connection error.');
    }
  };

  // Compute Total Rolled Up Costs
  // Total Operational Cost = Fuel Cost + Maintenance + Tolls + Other
  const totalFuelCost = fuelLogs.reduce((sum, log) => sum + log.cost, 0);
  const totalTolls = expenses.reduce((sum, exp) => sum + (exp.toll || 0), 0);
  const totalOther = expenses.reduce((sum, exp) => sum + (exp.other || 0), 0);
  const totalMaintenance = expenses.reduce((sum, exp) => sum + (exp.linkedMaintenanceCost || 0), 0);
  const totalOperationalCost = totalFuelCost + totalTolls + totalOther + totalMaintenance;

  const isFinancialAnalyst = user?.role === 'FinancialAnalyst';
  const isDispatcher = user?.role === 'Dispatcher';

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <h1>Fuel & Expense Management</h1>
          <p>Track fuel efficiency, tolls, general operational overheads, and maintenance expenses.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(isDispatcher || isFinancialAnalyst) && (
            <button className="btn btn-secondary" onClick={handleOpenFuelModal} style={{ display: 'flex', gap: '8px' }}>
              <Fuel size={16} />
              Log Fuel
            </button>
          )}
          {isFinancialAnalyst && (
            <button className="btn btn-primary" onClick={handleOpenExpenseModal} style={{ display: 'flex', gap: '8px' }}>
              <Plus size={16} />
              Add Expense
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'fuel' ? 'active' : ''}`}
          onClick={() => setActiveTab('fuel')}
        >
          Fuel Logs
        </button>
        <button 
          className={`tab ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          Operational Expenses
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', height: '30vh', alignItems: 'center', justifyContent: 'center' }}>
          <div className="pulse-dot"></div>
          <span style={{ color: '#94a3b8' }}>Loading expense lists...</span>
        </div>
      ) : activeTab === 'fuel' ? (
        /* Fuel Logs Table */
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Trip Reference</th>
                <th>Refuel Date</th>
                <th>Volume (Liters)</th>
                <th>Fuel Cost</th>
                <th>Refuel Rate</th>
              </tr>
            </thead>
            <tbody>
              {fuelLogs.length > 0 ? (
                fuelLogs.map(log => (
                  <tr key={log._id}>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                      {log.vehicleId?.nameModel || 'Unknown'}
                    </td>
                    <td>{log.tripId?.tripCode || 'Manual Log / No Trip'}</td>
                    <td>{new Date(log.date).toLocaleDateString()}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{log.liters} L</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>₹{log.cost.toLocaleString()}</td>
                    <td style={{ fontSize: '13px' }}>₹{(log.cost / log.liters).toFixed(2)}/L</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No refuels logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Expenses Table */
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Trip Reference</th>
                <th>Toll Fees</th>
                <th>Maintenance Link</th>
                <th>Other Fees</th>
                <th>Total Cost</th>
                <th>Logged Date</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length > 0 ? (
                expenses.map(exp => (
                  <tr key={exp._id}>
                    <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                      {exp.vehicleId?.nameModel || 'Unknown'}
                    </td>
                    <td>{exp.tripId?.tripCode || 'General Operations'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>₹{exp.toll.toLocaleString()}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: exp.linkedMaintenanceCost > 0 ? '#f59e0b' : '' }}>
                      ₹{exp.linkedMaintenanceCost.toLocaleString()}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>₹{exp.other.toLocaleString()}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#f8fafc' }}>
                      ₹{exp.total.toLocaleString()}
                    </td>
                    <td>{new Date(exp.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No general operational expenses logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Rolled Up Cost Footer Panel */}
      <div className="card-panel" style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b', fontFamily: 'Space Grotesk' }}>Total Operational Cost Breakdown</h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Fuel (₹{totalFuelCost.toLocaleString()}) + Maintenance (₹{totalMaintenance.toLocaleString()}) + Tolls (₹{totalTolls.toLocaleString()}) + Other (₹{totalOther.toLocaleString()})
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, color: '#94a3b8' }}>Aggregated Fleet Expense</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc', fontFamily: 'Space Grotesk' }}>
            ₹{totalOperationalCost.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Fuel Log Modal */}
      {isFuelModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Log Fuel Refuel Record</h3>
              <button className="modal-close" onClick={() => setIsFuelModalOpen(false)}><X size={18} /></button>
            </div>
            
            <form onSubmit={handleFuelSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '6px', padding: '10px 14px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label>Select Vehicle</label>
                  <select className="form-control" value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)} required>
                    <option value="">-- Choose Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v._id} value={v._id}>{v.nameModel} ({v.registrationNumber})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Associated Trip (Optional)</label>
                  <select className="form-control" value={selectedTripId} onChange={(e) => setSelectedTripId(e.target.value)}>
                    <option value="">-- No linked active trip --</option>
                    {trips.filter(t => t.status === 'Dispatched').map(t => (
                      <option key={t._id} value={t._id}>{t.tripCode} ({t.source} to {t.destination})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Refuel Date</label>
                  <input type="date" className="form-control" value={fuelDate} onChange={(e) => setFuelDate(e.target.value)} required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Fuel Volume (Liters)</label>
                    <input type="number" step="any" className="form-control" placeholder="e.g. 42" value={fuelLiters} onChange={(e) => setFuelLiters(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Fuel Invoice Cost (₹)</label>
                    <input type="number" className="form-control" placeholder="e.g. 3150" value={fuelCost} onChange={(e) => setFuelCost(e.target.value)} required />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsFuelModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Fuel Refuel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Log Operational Expense</h3>
              <button className="modal-close" onClick={() => setIsExpenseModalOpen(false)}><X size={18} /></button>
            </div>
            
            <form onSubmit={handleExpenseSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '6px', padding: '10px 14px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label>Select Vehicle</label>
                  <select className="form-control" value={expVehicleId} onChange={(e) => setExpVehicleId(e.target.value)} required>
                    <option value="">-- Choose Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v._id} value={v._id}>{v.nameModel} ({v.registrationNumber})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Associated Trip (Optional)</label>
                  <select className="form-control" value={expTripId} onChange={(e) => setExpTripId(e.target.value)}>
                    <option value="">-- General operational overhead --</option>
                    {trips.map(t => (
                      <option key={t._id} value={t._id}>{t.tripCode} ({t.source} to {t.destination})</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Toll Gate Fees (₹)</label>
                    <input type="number" className="form-control" placeholder="e.g. 120" value={expToll} onChange={(e) => setExpToll(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Other Miscellaneous Fees (₹)</label>
                    <input type="number" className="form-control" placeholder="e.g. 50" value={expOther} onChange={(e) => setExpOther(e.target.value)} />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsExpenseModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
