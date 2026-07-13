import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { 
  Play, 
  MapPin, 
  Clock, 
  AlertCircle,
  TrendingUp,
  RotateCw
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, tripsRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/trips')
      ]);
      if (analyticsRes.ok && tripsRes.ok) {
        const analyticsData = await analyticsRes.json();
        const tripsData = await tripsRes.json();
        setAnalytics(analyticsData);
        setTrips(tripsData);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="pulse-dot"></div>
        <span style={{ color: '#94a3b8' }}>Loading Dashboard Metrics...</span>
      </div>
    );
  }

  const kpis = analytics?.kpis || {};
  
  // Filter recent trips based on criteria if needed
  let displayTrips = trips.slice(0, 5); // show top 5 recent trips
  if (filterStatus) {
    displayTrips = trips.filter(t => t.status === filterStatus).slice(0, 5);
  }

  // Calculate statuses for horizontal status bar
  const availCount = kpis.availableVehicles || 0;
  const onTripCount = kpis.activeVehicles || 0;
  const inShopCount = kpis.inShopVehicles || 0;
  const retiredCount = kpis.retiredVehicles || 0;
  const totalBarCount = availCount + onTripCount + inShopCount + retiredCount;

  const pctAvail = totalBarCount > 0 ? (availCount / totalBarCount) * 100 : 0;
  const pctOnTrip = totalBarCount > 0 ? (onTripCount / totalBarCount) * 100 : 0;
  const pctInShop = totalBarCount > 0 ? (inShopCount / totalBarCount) * 100 : 0;
  const pctRetired = totalBarCount > 0 ? (retiredCount / totalBarCount) * 100 : 0;

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Completed': return 'badge-completed';
      case 'Dispatched': return 'badge-dispatched';
      case 'Draft': return 'badge-draft';
      case 'Cancelled': return 'badge-cancelled';
      default: return 'badge-draft';
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <h1>Operations Dashboard</h1>
          <p>Real-time overview of fleet activities, dispatch queue, and safety tracking.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={fetchDashboardData} style={{ display: 'flex', gap: '8px' }}>
            <RotateCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card-panel" style={{ padding: '16px 24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Filters</span>
        <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
          <select 
            className="form-control" 
            style={{ width: '180px', padding: '6px 12px' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Vehicle Type: All</option>
            <option value="Van">Vans</option>
            <option value="Truck">Trucks</option>
            <option value="Mini">Minis</option>
          </select>
          <select 
            className="form-control" 
            style={{ width: '180px', padding: '6px 12px' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Trip Status: All</option>
            <option value="Draft">Draft</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-metrics">
        <div className="card-metric">
          <span className="metric-title">Active Fleet</span>
          <span className="metric-value">{kpis.activeVehicles + kpis.availableVehicles + kpis.inShopVehicles || 0}</span>
          <span className="metric-footer" style={{ color: '#10b981' }}>Total registered assets</span>
        </div>
        <div className="card-metric" style={{ borderLeft: '3px solid #10b981' }}>
          <span className="metric-title">Available Vehicles</span>
          <span className="metric-value" style={{ color: '#10b981' }}>{kpis.availableVehicles || 0}</span>
          <span className="metric-footer">Ready for dispatch</span>
        </div>
        <div className="card-metric" style={{ borderLeft: '3px solid #3b82f6' }}>
          <span className="metric-title">Vehicles On-Trip</span>
          <span className="metric-value" style={{ color: '#3b82f6' }}>{kpis.activeVehicles || 0}</span>
          <span className="metric-footer">In delivery transit</span>
        </div>
        <div className="card-metric" style={{ borderLeft: '3px solid #f59e0b' }}>
          <span className="metric-title">In Maintenance</span>
          <span className="metric-value" style={{ color: '#f59e0b' }}>{kpis.inShopVehicles || 0}</span>
          <span className="metric-footer">Under servicing</span>
        </div>
        <div className="card-metric">
          <span className="metric-title">Active Dispatches</span>
          <span className="metric-value">{kpis.activeTrips || 0}</span>
          <span className="metric-footer" style={{ color: '#3b82f6' }}>Trips in-flight</span>
        </div>
        <div className="card-metric">
          <span className="metric-title">Pending Orders</span>
          <span className="metric-value">{kpis.pendingTrips || 0}</span>
          <span className="metric-footer">Draft dispatches</span>
        </div>
        <div className="card-metric" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
          <span className="metric-title" style={{ color: '#f59e0b' }}>Fleet Utilization</span>
          <span className="metric-value" style={{ color: '#f59e0b' }}>
            {kpis.fleetUtilization !== '—' && kpis.fleetUtilization !== undefined ? `${kpis.fleetUtilization}%` : '—'}
          </span>
          <span className="metric-footer">On-trip / Active Fleet</span>
        </div>
      </div>

      {/* Main Sections */}
      <div className="dashboard-grid">
        {/* Left Side: Recent Trips */}
        <div className="card-panel recent-trips-panel">
          <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Recent Trips & Dispatch Status</span>
          </div>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Trip Code</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>ETA / Closed Info</th>
                </tr>
              </thead>
              <tbody>
                {displayTrips.length > 0 ? (
                  displayTrips.map(trip => (
                    <tr key={trip._id}>
                      <td style={{ fontWeight: 600, color: '#f59e0b', fontFamily: 'Space Grotesk' }}>
                        {trip.tripCode}
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{trip.vehicleId?.nameModel || 'Unassigned'}</span>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{trip.vehicleId?.registrationNumber}</div>
                      </td>
                      <td>{trip.driverId?.name || 'Unassigned'}</td>
                      <td>
                        <div style={{ fontSize: '13px' }}>{trip.destination}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>from {trip.source}</div>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(trip.status)}`}>
                          {trip.status === 'Dispatched' && <span className="pulse-dot" style={{ margin: '0 6px 0 0', width: '6px', height: '6px' }} />}
                          {trip.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        {trip.status === 'Dispatched' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6' }}>
                            <Clock size={14} />
                            <span>In-transit (ETA ~{Math.round(trip.plannedDistanceKm * 1.5)}m)</span>
                          </div>
                        )}
                        {trip.status === 'Completed' && (
                          <div style={{ color: '#10b981' }}>
                            <span>Revenue: ₹{trip.revenue?.toLocaleString()}</span>
                          </div>
                        )}
                        {trip.status === 'Draft' && <span style={{ color: '#94a3b8' }}>Awaiting Dispatch</span>}
                        {trip.status === 'Cancelled' && <span style={{ color: '#ef4444' }}>Trip Aborted</span>}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      {trips.length === 0 ? "No trips dispatched yet — plan your first trip." : "No recent trips matching filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Vehicle Status Breakdown */}
        <div className="status-bar-wrapper">
          <div className="status-bar-title" style={{ color: '#f59e0b', fontFamily: 'Space Grotesk' }}>
            Vehicle Registry Status
          </div>
          
          <div className="status-bar-container">
            <div 
              className="status-segment" 
              style={{ width: `${pctAvail}%`, backgroundColor: '#10b981' }} 
              title={`Available: ${availCount}`}
            />
            <div 
              className="status-segment" 
              style={{ width: `${pctOnTrip}%`, backgroundColor: '#3b82f6' }} 
              title={`On Trip: ${onTripCount}`}
            />
            <div 
              className="status-segment" 
              style={{ width: `${pctInShop}%`, backgroundColor: '#f59e0b' }} 
              title={`In Shop: ${inShopCount}`}
            />
            <div 
              className="status-segment" 
              style={{ width: `${pctRetired}%`, backgroundColor: '#ef4444' }} 
              title={`Retired: ${retiredCount}`}
            />
          </div>

          <div className="status-legend">
            <div className="legend-item">
              <div>
                <span className="legend-color" style={{ backgroundColor: '#10b981' }} />
                <span>Available</span>
              </div>
              <span style={{ fontWeight: 600 }}>{availCount}</span>
            </div>
            <div className="legend-item">
              <div>
                <span className="legend-color" style={{ backgroundColor: '#3b82f6' }} />
                <span>On Trip</span>
              </div>
              <span style={{ fontWeight: 600 }}>{onTripCount}</span>
            </div>
            <div className="legend-item">
              <div>
                <span className="legend-color" style={{ backgroundColor: '#f59e0b' }} />
                <span>In Shop</span>
              </div>
              <span style={{ fontWeight: 600 }}>{inShopCount}</span>
            </div>
            <div className="legend-item">
              <div>
                <span className="legend-color" style={{ backgroundColor: '#ef4444' }} />
                <span>Retired</span>
              </div>
              <span style={{ fontWeight: 600 }}>{retiredCount}</span>
            </div>
          </div>

          {/* Quick Alert box for Suspended Drivers/Expired Licenses */}
          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '8px', display: 'flex', gap: '12px' }}>
            <AlertCircle style={{ color: '#ef4444', flexShrink: 0 }} size={20} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>Safety Watchlist Alerts</div>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                1 driver has an expired LMV/HMV commercial driving license. Dispatcher checks are active at trip-planning blocks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
