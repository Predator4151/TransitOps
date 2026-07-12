import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { reports } from '../services/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await reports.getDashboard();
        if (res.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="container-fluid py-2">
        <div className="row g-3 mb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="col-12 col-sm-6 col-md-3">
              <div className="card border-0 shadow-sm p-3 loading-skeleton" style={{ height: '110px' }}></div>
            </div>
          ))}
        </div>
        <div className="row g-4">
          <div className="col-12 col-lg-8">
            <div className="card border-0 shadow-sm p-4 mb-4 loading-skeleton" style={{ height: '300px' }}></div>
            <div className="card border-0 shadow-sm p-4 loading-skeleton" style={{ height: '250px' }}></div>
          </div>
          <div className="col-12 col-lg-4">
            <div className="card border-0 shadow-sm p-4 mb-4 loading-skeleton" style={{ height: '300px' }}></div>
            <div className="card border-0 shadow-sm p-4 loading-skeleton" style={{ height: '250px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const recentTrips = data?.recentTrips || [];
  const notifications = data?.notifications || [];
  const charts = data?.charts || {};

  // Vehicle Status Pie Chart Config
  const pieData = {
    labels: Object.keys(charts.vehicleStatusCounts || {}),
    datasets: [
      {
        data: Object.values(charts.vehicleStatusCounts || {}),
        backgroundColor: ['#198754', '#0D6EFD', '#FFC107', '#6C757D'],
        borderWidth: 1,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
        }
      }
    }
  };

  // Monthly Fuel Expenses Bar Chart Config
  const monthlyFuelExpenses = charts.monthlyFuelExpenses || [];
  const barData = {
    labels: monthlyFuelExpenses.map(item => item._id),
    datasets: [
      {
        label: 'Fuel Expense ($)',
        data: monthlyFuelExpenses.map(item => item.total),
        backgroundColor: 'rgba(13, 110, 253, 0.85)',
        borderRadius: 6
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const kpiList = [
    { title: 'Fleet Utilization', value: `${kpis.fleetUtilization}%`, type: 'primary', icon: 'bi-speedometer', detail: 'Active vehicles vs. active fleet' },
    { title: 'Active Trips', value: kpis.activeTrips, type: 'success', icon: 'bi-geo-alt', detail: 'Dispatched trips in progress' },
    { title: 'Available Vehicles', value: kpis.availableVehicles, type: 'info', icon: 'bi-truck', detail: 'Vehicles ready for assignment' },
    { title: 'Drivers On Duty', value: kpis.driversOnDuty, type: 'warning', icon: 'bi-people', detail: 'Available or on-trip drivers' },
    { title: 'Pending Trips', value: kpis.pendingTrips, type: 'secondary', icon: 'bi-clock-history', detail: 'Draft trips in backlog' },
    { title: 'In Maintenance', value: kpis.inShopVehicles, type: 'danger', icon: 'bi-tools', detail: 'Vehicles In Shop currently' },
    { title: 'Total Fuel Usage', value: `${kpis.totalFuelLiters} L`, type: 'primary', icon: 'bi-fuel-pump', detail: 'Total logs fuel consumption' },
    { title: 'Operational Cost', value: `$${kpis.totalOperationalCost.toLocaleString()}`, type: 'success', icon: 'bi-cash-coin', detail: 'Fuel & Maintenance expenses' }
  ];

  return (
    <div className="container-fluid px-0">
      {/* Welcome Title */}
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Fleet Operations</h2>
        <p className="text-secondary">Real-time status updates and logistics overview</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="row g-3 mb-4">
        {kpiList.map((kpi, idx) => (
          <div key={idx} className="col-12 col-sm-6 col-md-3">
            <div className={`card transitops-card kpi-card ${kpi.type} h-100 p-3`}>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <small className="text-secondary fw-semibold uppercase-label text-truncate d-block">{kpi.title}</small>
                  <h3 className="fw-bold my-1 text-dark">{kpi.value}</h3>
                  <span className="text-secondary fs-8">{kpi.detail}</span>
                </div>
                <div className={`p-2 rounded-3 bg-${kpi.type} bg-opacity-10 text-${kpi.type}`}>
                  <i className={`bi ${kpi.icon} fs-4`}></i>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4 mb-4">
        {/* Monthly Fuel Expense Chart */}
        <div className="col-12 col-lg-8">
          <div className="card transitops-card p-4 h-100">
            <h5 className="fw-bold mb-3"><i className="bi-bar-chart-line-fill text-primary me-2"></i> Monthly Fuel Expenses</h5>
            <div style={{ height: '300px', position: 'relative' }}>
              {monthlyFuelExpenses.length > 0 ? (
                <Bar data={barData} options={barOptions} />
              ) : (
                <div className="d-flex h-100 align-items-center justify-content-center text-muted">
                  No monthly fuel cost log recorded.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vehicle Status Pie Chart */}
        <div className="col-12 col-lg-4">
          <div className="card transitops-card p-4 h-100">
            <h5 className="fw-bold mb-3"><i className="bi-pie-chart-fill text-success me-2"></i> Vehicle Status</h5>
            <div style={{ height: '300px', position: 'relative' }}>
              <Pie data={pieData} options={pieOptions} />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Recent Trips Table */}
        <div className="col-12 col-lg-8">
          <div className="card transitops-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0"><i className="bi-geo-fill text-primary me-2"></i> Recent Trips</h5>
              <Link to="/trips" className="btn btn-outline-primary btn-sm rounded-pill px-3">View All</Link>
            </div>
            
            <div className="table-responsive">
              <table className="table transitops-table w-100 text-nowrap">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Vehicle</th>
                    <th>Driver</th>
                    <th>Cargo Weight</th>
                    <th>Distance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrips.length > 0 ? (
                    recentTrips.map((trip) => (
                      <tr key={trip._id}>
                        <td>
                          <div className="fw-semibold text-dark">{trip.source} → {trip.destination}</div>
                        </td>
                        <td>{trip.vehicle ? `${trip.vehicle.name} (${trip.vehicle.registrationNumber})` : 'N/A'}</td>
                        <td>{trip.driver ? trip.driver.name : 'N/A'}</td>
                        <td>{trip.cargoWeight} kg</td>
                        <td>{trip.plannedDistance} km</td>
                        <td>
                          <span className={`badge-status ${trip.status.toLowerCase().replace(/\s+/g, '')}`}>
                            {trip.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-muted">No trips recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Actions & Notifications */}
        <div className="col-12 col-lg-4">
          {/* Quick Actions */}
          <div className="card transitops-card p-4 mb-4">
            <h5 className="fw-bold mb-3"><i className="bi-lightning-fill text-warning me-2"></i> Quick Actions</h5>
            <div className="d-grid gap-2">
              <button onClick={() => navigate('/trips')} className="btn btn-outline-primary d-flex align-items-center justify-content-between text-start p-2.5">
                <span><i className="bi-geo-alt-fill me-2"></i> Plan a New Trip</span>
                <i className="bi-chevron-right"></i>
              </button>
              <button onClick={() => navigate('/maintenance')} className="btn btn-outline-warning d-flex align-items-center justify-content-between text-start p-2.5">
                <span><i className="bi-tools me-2"></i> Log Vehicle Maintenance</span>
                <i className="bi-chevron-right"></i>
              </button>
              <button onClick={() => navigate('/fuel')} className="btn btn-outline-info d-flex align-items-center justify-content-between text-start p-2.5">
                <span><i className="bi-fuel-pump-fill me-2"></i> Record Fuel Purchase</span>
                <i className="bi-chevron-right"></i>
              </button>
              <button onClick={() => navigate('/expenses')} className="btn btn-outline-success d-flex align-items-center justify-content-between text-start p-2.5">
                <span><i className="bi-cash-coin me-2"></i> Log Toll or Insurance</span>
                <i className="bi-chevron-right"></i>
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="card transitops-card p-4">
            <h5 className="fw-bold mb-3"><i className="bi-bell-fill text-danger me-2"></i> Alerts &amp; Notifications</h5>
            <div className="d-flex flex-column gap-3" style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {notifications.length > 0 ? (
                notifications.map((notif, idx) => (
                  <div key={idx} className={`p-3 rounded-3 bg-${notif.type} bg-opacity-10 border-start border-3 border-${notif.type} d-flex align-items-start gap-2`}>
                    <i className={`bi ${notif.type === 'danger' ? 'bi-exclamation-octagon-fill text-danger' : notif.type === 'warning' ? 'bi-exclamation-triangle-fill text-warning' : 'bi-info-circle-fill text-info'} fs-5 mt-0.5`}></i>
                    <div>
                      <div className="small text-dark fw-medium leading-tight">{notif.message}</div>
                      <span className="text-secondary fs-8 d-block mt-1">{notif.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-3 text-muted">
                  <i className="bi-check-circle-fill text-success fs-3 mb-2 d-block"></i>
                  All systems operating normally.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
