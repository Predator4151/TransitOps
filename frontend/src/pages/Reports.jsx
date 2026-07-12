import React, { useState, useEffect } from 'react';
import { reports as reportApi } from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Reports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await reportApi.getAnalytics();
        if (res.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="container-fluid py-2">
        <div className="card border-0 shadow-sm p-4 mb-4 loading-skeleton" style={{ height: '100px' }}></div>
        <div className="row g-4">
          <div className="col-12 col-md-6">
            <div className="card border-0 shadow-sm p-4 loading-skeleton" style={{ height: '350px' }}></div>
          </div>
          <div className="col-12 col-md-6">
            <div className="card border-0 shadow-sm p-4 loading-skeleton" style={{ height: '350px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const vehicles = data?.vehicles || [];
  const expenseBreakdown = data?.expenseBreakdown || {};

  // 1. CSV Export Handler
  const handleCSVExport = () => {
    if (vehicles.length === 0) return;
    
    // Define headers
    const headers = [
      'Registration Number',
      'Vehicle Name',
      'Type',
      'Acquisition Cost ($)',
      'Total Costs ($)',
      'Estimated Revenue ($)',
      'Net Profit ($)',
      'ROI (%)',
      'Fuel Efficiency (km/L)'
    ];

    // Map rows
    const rows = vehicles.map(v => [
      v.registrationNumber,
      v.name,
      v.type,
      v.acquisitionCost,
      v.costs?.total || 0,
      v.revenue || 0,
      v.netProfit || 0,
      v.roi,
      v.fuelEfficiency
    ]);

    // Build CSV string
    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transitops_fleet_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. PDF Export Handler (Window Print styled or alert)
  const handlePDFExport = () => {
    // Standard professional print trigger
    window.print();
  };

  // --- Charts Config ---

  // ROI Chart Config
  const roiData = {
    labels: vehicles.map(v => v.registrationNumber),
    datasets: [
      {
        label: 'ROI (%)',
        data: vehicles.map(v => v.roi),
        backgroundColor: vehicles.map(v => v.roi >= 0 ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)'),
        borderRadius: 12
      }
    ]
  };

  const roiOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        title: { display: true, text: 'Return on Investment (%)' },
        grid: { color: 'rgba(0,0,0,0.03)' }
      },
      x: { grid: { display: false } }
    }
  };

  // Fuel Efficiency Chart Config
  const fuelData = {
    labels: vehicles.map(v => v.registrationNumber),
    datasets: [
      {
        label: 'Fuel Efficiency (km/L)',
        data: vehicles.map(v => v.fuelEfficiency),
        backgroundColor: 'rgba(99, 102, 241, 0.85)',
        borderRadius: 12
      }
    ]
  };

  const fuelOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        title: { display: true, text: 'Efficiency (km/L)' },
        grid: { color: 'rgba(0,0,0,0.03)' }
      },
      x: { grid: { display: false } }
    }
  };

  // Expense Breakdown doughnut chart
  const expenseKeys = Object.keys(expenseBreakdown);
  const expenseData = {
    labels: expenseKeys,
    datasets: [
      {
        data: Object.values(expenseBreakdown),
        backgroundColor: ['#6366F1', '#F59E0B', '#0EA5E9', '#EF4444', '#10B981', '#64748B'],
        borderWidth: 1
      }
    ]
  };

  const expenseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          usePointStyle: true
        }
      }
    }
  };

  return (
    <div className="container-fluid px-0 print-container">
      {/* Page Header (Hidden on print) */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4 d-print-none">
        <div>
          <h2 className="fw-bold mb-1">Reports &amp; Analytics</h2>
          <p className="text-secondary mb-0">Export financial logs, audit efficiency, and check vehicle ROI</p>
        </div>
        <div className="d-flex gap-2">
          <button onClick={handleCSVExport} className="btn btn-outline-primary d-flex align-items-center gap-2">
            <i className="bi-file-earmark-spreadsheet"></i> Export CSV
          </button>
          <button onClick={handlePDFExport} className="btn btn-primary d-flex align-items-center gap-2">
            <i className="bi-printer"></i> Print Report / PDF
          </button>
        </div>
      </div>

      {/* Print Title (Visible only on print) */}
      <div className="d-none d-print-block mb-4 text-center">
        <h2 className="fw-bold">TransitOps - Smart Transport Operations</h2>
        <h4>Fleet Performance and Financial Audit Report</h4>
        <small className="text-muted">Generated on {new Date().toLocaleString()}</small>
        <hr />
      </div>

      {/* Analytics Summary Row */}
      <div className="row g-4 mb-4">
        {/* Cost Breakdown Doughnut */}
        <div className="col-12 col-md-5">
          <div className="card transitops-card p-4 h-100">
            <h5 className="fw-bold mb-3"><i className="bi-pie-chart-fill text-primary me-2"></i> Global Expenses</h5>
            <div style={{ height: '260px', position: 'relative' }}>
              {expenseKeys.length > 0 ? (
                <Doughnut data={expenseData} options={expenseOptions} />
              ) : (
                <div className="d-flex h-100 align-items-center justify-content-center text-muted">
                  No expense records logged.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ROI Bar chart */}
        <div className="col-12 col-md-7">
          <div className="card transitops-card p-4 h-100">
            <h5 className="fw-bold mb-3"><i className="bi-percent text-success me-2"></i> Vehicle ROI %</h5>
            <div style={{ height: '260px', position: 'relative' }}>
              {vehicles.length > 0 ? (
                <Bar data={roiData} options={roiOptions} />
              ) : (
                <div className="d-flex h-100 align-items-center justify-content-center text-muted">
                  Insufficient data for ROI metrics.
                </div>
              )}
            </div>
            <div className="text-secondary fs-8 mt-2 d-print-none">
              * ROI formula: Net Profit (Estimated Revenue - Operational Costs) / Acquisition Cost. Estimated Revenue is computed as distance completed * $3.50.
            </div>
          </div>
        </div>
      </div>

      {/* Fuel Efficiency Bar Chart */}
      <div className="card transitops-card p-4 mb-4">
        <h5 className="fw-bold mb-3"><i className="bi-fuel-pump-fill text-info me-2"></i> Average Fuel Efficiency per Vehicle (km/L)</h5>
        <div style={{ height: '260px', position: 'relative' }}>
          {vehicles.length > 0 ? (
            <Bar data={fuelData} options={fuelOptions} />
          ) : (
            <div className="d-flex h-100 align-items-center justify-content-center text-muted">
              Refuel log data needed to compute efficiency.
            </div>
          )}
        </div>
      </div>

      {/* Detailed Fleet Analytics Table */}
      <div className="card transitops-card p-4">
        <h5 className="fw-bold mb-3"><i className="bi-table text-primary me-2"></i> Fleet Financials Overview</h5>
        <div className="table-responsive">
          <table className="table transitops-table text-nowrap w-100">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Vehicle Model</th>
                <th>Acq. Cost</th>
                <th>Operational Cost</th>
                <th>Est. Revenue</th>
                <th>Net Profit</th>
                <th>ROI (%)</th>
                <th>Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td className="fw-bold text-dark">{v.registrationNumber}</td>
                  <td>{v.name} ({v.type})</td>
                  <td>${v.acquisitionCost.toLocaleString()}</td>
                  <td>${v.costs?.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>${v.revenue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className={`fw-semibold ${v.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                    {v.netProfit >= 0 ? '+' : ''}${v.netProfit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span className={`badge bg-${v.roi >= 0 ? 'success' : 'danger'} rounded-pill px-2 py-1`}>
                      {v.roi}%
                    </span>
                  </td>
                  <td>
                    <strong className="text-secondary">{v.fuelEfficiency ? `${v.fuelEfficiency} km/L` : 'N/A'}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
