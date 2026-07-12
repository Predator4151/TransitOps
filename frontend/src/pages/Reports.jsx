import React, { useState, useEffect } from 'react';
import { reports as reportApi } from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

// Month label: "2025-03" → "Mar"
const shortMonth = (str) => {
  if (!str) return '';
  const [y, m] = str.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-IN', { month: 'short' });
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, accent }) => (
  <div
    className="card border-0 p-3 flex-fill"
    style={{ borderLeft: `3px solid ${accent}` }}
  >
    <div
      className="text-uppercase fw-semibold mb-2"
      style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: accent }}
    >
      {label}
    </div>
    <div className="fw-bold" style={{ fontSize: '1.6rem', lineHeight: 1.15 }}>
      {value}
    </div>
  </div>
);

// ─── Horizontal custom bar (no Chart.js) ─────────────────────────────────────
const HBar = ({ label, value, maxValue, color }) => {
  const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  return (
    <div className="mb-3">
      <div className="fw-semibold mb-1" style={{ fontSize: '0.8rem', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div
        className="rounded-1 overflow-hidden position-relative"
        style={{ height: '28px', backgroundColor: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-100 rounded-1"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            transition: 'width 0.6s ease'
          }}
        />
      </div>
      <div className="text-secondary mt-1" style={{ fontSize: '0.72rem' }}>
        ₹{fmt(value)}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const Reports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await reportApi.getAnalytics();
        if (res.success) setData(res.data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const handleCSVExport = () => {
    const vehicles = data?.vehicles || [];
    if (vehicles.length === 0) return;
    const headers = ['Registration', 'Name', 'Type', 'Acq. Cost (₹)', 'Total Costs (₹)', 'Revenue (₹)', 'Net Profit (₹)', 'ROI (%)', 'Fuel Efficiency (km/L)'];
    const rows = vehicles.map(v => [v.registrationNumber, v.name, v.type, v.acquisitionCost, v.costs?.total || 0, v.revenue || 0, v.netProfit || 0, v.roi, v.fuelEfficiency]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `transitops_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="container-fluid px-0 py-4 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="text-muted mt-2">Building analytics...</p>
      </div>
    );
  }

  const vehicles    = data?.vehicles      || [];
  const kpis        = data?.kpis          || {};
  const monthlyRev  = data?.monthlyRevenue || [];

  // ── Monthly Revenue Chart ───────────────────────────────────────────────────
  const revLabels   = monthlyRev.map(m => shortMonth(m._id));
  const revValues   = monthlyRev.map(m => m.revenue);
  const maxRev      = Math.max(...revValues, 1);

  const revenueChartData = {
    labels: revLabels.length > 0 ? revLabels : ['No data'],
    datasets: [{
      label: 'Monthly Revenue (₹)',
      data: revValues.length > 0 ? revValues : [0],
      backgroundColor: 'rgba(100,160,240,0.85)',
      borderRadius: 4,
      barThickness: 32
    }]
  };

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `₹${fmt(ctx.parsed.y)}`
        }
      }
    },
    scales: {
      y: {
        display: false,
        grid: { display: false }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#aaa', font: { size: 11 } }
      }
    }
  };

  // ── Top Costliest Vehicles ─────────────────────────────────────────────────
  const topCostly = [...vehicles]
    .sort((a, b) => (b.costs?.total || 0) - (a.costs?.total || 0))
    .slice(0, 5);
  const maxCost   = Math.max(...topCostly.map(v => v.costs?.total || 0), 1);
  const barColors = ['#f97066', '#e8820c', '#5fa8d3', '#a78bfa', '#34d399'];

  return (
    <div className="container-fluid px-0">
      {/* Page Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Reports &amp; Analytics</h2>
          <p className="text-secondary mb-0">Audit efficiency, track revenue, and analyse fleet ROI</p>
        </div>
        <div className="d-flex gap-2">
          <button onClick={handleCSVExport} className="btn btn-outline-primary d-flex align-items-center gap-2">
            <i className="bi-file-earmark-spreadsheet"></i> Export CSV
          </button>
          <button onClick={() => window.print()} className="btn btn-primary d-flex align-items-center gap-2">
            <i className="bi-printer"></i> Print / PDF
          </button>
        </div>
      </div>

      {/* ── KPI Cards Row ─────────────────────────────────────────────────── */}
      <div className="d-flex flex-wrap gap-3 mb-2">
        <KpiCard
          label="Fuel Efficiency"
          value={`${kpis.avgFuelEfficiency ?? 0} km/l`}
          accent="#28a745"
        />
        <KpiCard
          label="Fleet Utilization"
          value={`${kpis.fleetUtilization ?? 0}%`}
          accent="#28a745"
        />
        <KpiCard
          label="Operational Cost"
          value={fmt(kpis.totalOperationalCost)}
          accent="#e8820c"
        />
        <KpiCard
          label="Vehicle ROI"
          value={`${kpis.overallRoi ?? 0}%`}
          accent="#28a745"
        />
      </div>

      {/* ROI Formula Note */}
      <p className="text-secondary mb-4" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
        ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost
      </p>

      {/* ── Charts Row ───────────────────────────────────────────────────── */}
      <div className="row g-4 mb-4">
        {/* Monthly Revenue Bar Chart */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 p-4 h-100">
            <h6
              className="fw-bold mb-4 text-uppercase"
              style={{ letterSpacing: '0.08em', fontSize: '0.75rem' }}
            >
              Monthly Revenue
            </h6>
            {revValues.length > 0 ? (
              <div style={{ height: '220px' }}>
                <Bar data={revenueChartData} options={revenueChartOptions} />
              </div>
            ) : (
              <div className="d-flex h-100 align-items-center justify-content-center text-muted py-5">
                No completed trips yet.
              </div>
            )}
          </div>
        </div>

        {/* Top Costliest Vehicles Horizontal Bars */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 p-4 h-100">
            <h6
              className="fw-bold mb-4 text-uppercase"
              style={{ letterSpacing: '0.08em', fontSize: '0.75rem' }}
            >
              Top Costliest Vehicles
            </h6>
            {topCostly.length > 0 ? (
              topCostly.map((v, i) => (
                <HBar
                  key={v.id}
                  label={v.registrationNumber}
                  value={v.costs?.total || 0}
                  maxValue={maxCost}
                  color={barColors[i % barColors.length]}
                />
              ))
            ) : (
              <div className="d-flex h-100 align-items-center justify-content-center text-muted py-5">
                No expense data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Detailed Fleet Financials Table ──────────────────────────────── */}
      <div className="card border-0 p-4">
        <h6
          className="fw-bold mb-4 text-uppercase"
          style={{ letterSpacing: '0.08em', fontSize: '0.75rem' }}
        >
          <i className="bi-table me-2 text-primary"></i>Fleet Financials Overview
        </h6>
        <div className="table-responsive">
          <table className="table transitops-table text-nowrap w-100">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Vehicle</th>
                <th>Acq. Cost</th>
                <th>Operational Cost</th>
                <th>Est. Revenue</th>
                <th>Net Profit</th>
                <th>ROI (%)</th>
                <th>Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length > 0 ? vehicles.map((v) => (
                <tr key={v.id}>
                  <td className="fw-bold">{v.registrationNumber}</td>
                  <td>{v.name} <span className="text-secondary fs-8">({v.type})</span></td>
                  <td>₹{fmt(v.acquisitionCost)}</td>
                  <td>₹{fmt(v.costs?.total)}</td>
                  <td>₹{fmt(v.revenue)}</td>
                  <td className={`fw-semibold ${v.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                    {v.netProfit >= 0 ? '+' : ''}₹{fmt(v.netProfit)}
                  </td>
                  <td>
                    <span className={`badge rounded-pill px-2 py-1 bg-${v.roi >= 0 ? 'success' : 'danger'}`}>
                      {v.roi}%
                    </span>
                  </td>
                  <td className="text-secondary fw-semibold">
                    {v.fuelEfficiency ? `${v.fuelEfficiency} km/L` : 'N/A'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" className="text-center text-muted py-4">
                    No vehicle analytics data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
