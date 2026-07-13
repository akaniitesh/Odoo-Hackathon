import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { FileDown, RotateCw, BarChart3, TrendingUp, DollarSign, Activity } from 'lucide-react';

export default function Analytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!analytics || !analytics.vehicleROI) return;
    
    const headers = [
      'Registration Number',
      'Model Code',
      'Vehicle Type',
      'Acquisition Cost (INR)',
      'Fuel Costs (INR)',
      'Maintenance Costs (INR)',
      'Revenue Billed (INR)',
      'Total Operating Overhead (INR)',
      'Vehicle ROI (%)'
    ];

    const rows = analytics.vehicleROI.map(v => [
      v.registrationNumber,
      v.nameModel,
      v.type,
      v.acquisitionCost,
      v.fuelCost,
      v.maintenanceCost,
      v.revenue,
      v.totalCost,
      v.roi
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `transitops_fleet_roi_metrics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="pulse-dot"></div>
        <span style={{ color: '#94a3b8' }}>Processing analytical graphs...</span>
      </div>
    );
  }

  const kpis = analytics?.kpis || {};
  const monthlyRevenueData = analytics?.monthlyRevenue || [];
  const costliestVehiclesData = analytics?.costliestVehicles || [];

  // Sort monthly revenue chronologically or keep it natural
  const chartRevenue = monthlyRevenueData.length > 0 ? monthlyRevenueData : [
    { month: 'May 26', revenue: 0 },
    { month: 'Jun 26', revenue: 0 },
    { month: 'Jul 26', revenue: kpis.totalRevenue || 0 }
  ];

  const chartCostliest = costliestVehiclesData.map(v => ({
    name: v.nameModel,
    'Fuel Cost': v.fuelCost,
    'Maint. Cost': v.maintenanceCost,
    'Total': v.totalCost
  }));

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <h1>Reports & Analytics</h1>
          <p>Analyze vehicle asset lifecycle ROI, fleet utilization ratios, and monthly financial performance.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={exportToCSV} style={{ display: 'flex', gap: '8px' }}>
            <FileDown size={16} />
            Export CSV
          </button>
          <button className="btn btn-secondary" onClick={fetchAnalyticsData} title="Refresh">
            <RotateCw size={16} />
          </button>
        </div>
      </div>

      {/* Analytics KPI widgets */}
      <div className="grid-metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="card-metric" style={{ borderLeft: '3px solid #10b981' }}>
          <span className="metric-title">Fuel Efficiency Average</span>
          <span className="metric-value">
            {kpis.fuelEfficiency !== '—' && kpis.fuelEfficiency !== undefined ? `${kpis.fuelEfficiency} ` : '—'}
            {kpis.fuelEfficiency !== '—' && kpis.fuelEfficiency !== undefined && <span style={{ fontSize: '14px', fontWeight: 500, color: '#94a3b8' }}>km/L</span>}
          </span>
          <span className="metric-footer">Total Completed Distance / Fuel</span>
        </div>
        <div className="card-metric" style={{ borderLeft: '3px solid #3b82f6' }}>
          <span className="metric-title">Asset Utilization</span>
          <span className="metric-value">
            {kpis.fleetUtilization !== '—' && kpis.fleetUtilization !== undefined ? `${kpis.fleetUtilization}%` : '—'}
          </span>
          <span className="metric-footer">Active dispatches ratio</span>
        </div>
        <div className="card-metric" style={{ borderLeft: '3px solid #ef4444' }}>
          <span className="metric-title">Operating Overhead</span>
          <span className="metric-value">₹{kpis.totalOperationalCost?.toLocaleString()}</span>
          <span className="metric-footer">Fuel + Maintenance + Tolls + Misc</span>
        </div>
        <div className="card-metric" style={{ borderLeft: '3px solid #f59e0b' }}>
          <span className="metric-title">Total Invoiced Revenue</span>
          <span className="metric-value" style={{ color: '#10b981' }}>₹{kpis.totalRevenue?.toLocaleString()}</span>
          <span className="metric-footer">Total value generated by trips</span>
        </div>
      </div>

      {/* Recharts Grid */}
      <div className="charts-grid">
        {/* Monthly Revenue Bar Chart */}
        <div className="chart-wrapper">
          <div className="chart-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} style={{ color: '#10b981' }} />
              <span>Monthly Invoiced Revenue (INR)</span>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRevenue} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }} 
                  cursor={{ fill: 'rgba(51, 65, 85, 0.2)' }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Costliest Vehicles Chart */}
        <div className="chart-wrapper">
          <div className="chart-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={16} style={{ color: '#ef4444' }} />
              <span>Top 5 Costliest Fleet Vehicles (Fuel + Maintenance)</span>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartCostliest} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Fuel Cost" stackId="a" fill="#3b82f6" name="Fuel Expense" />
                <Bar dataKey="Maint. Cost" stackId="a" fill="#f59e0b" name="Maintenance Expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Asset ROI Ledger */}
      <div className="card-panel" style={{ marginTop: '24px' }}>
        <div className="panel-title" style={{ color: '#f59e0b', fontFamily: 'Space Grotesk' }}>
          Vehicle Asset Lifetime ROI Ledger
        </div>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Registration No.</th>
                <th>Model Code</th>
                <th>Type</th>
                <th>Acquisition Cost</th>
                <th>Operational Costs (Fuel + Maintenance)</th>
                <th>Total Earnings</th>
                <th>Vehicle Net ROI</th>
              </tr>
            </thead>
            <tbody>
              {analytics.vehicleROI && analytics.vehicleROI.length > 0 ? (
                analytics.vehicleROI.map(v => {
                  const isPositive = v.roi >= 0;
                  return (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 600, color: '#f8fafc', fontFamily: 'Space Grotesk' }}>{v.registrationNumber}</td>
                      <td>{v.nameModel}</td>
                      <td>{v.type}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>₹{v.acquisitionCost.toLocaleString()}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                        <span>₹{v.totalCost.toLocaleString()}</span>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Fuel: ₹{v.fuelCost.toLocaleString()} | Maint: ₹{v.maintenanceCost.toLocaleString()}
                        </div>
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: '#10b981', fontWeight: 500 }}>
                        ₹{v.revenue.toLocaleString()}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: v.roi === null ? '#94a3b8' : isPositive ? '#10b981' : '#ef4444' }}>
                        {v.roi === null ? '—' : `${isPositive ? '+' : ''}${v.roi}%`}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No vehicle records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
