# TransitOps — Smart Transport Operations Platform (Frontend)

TransitOps is a modern, enterprise-grade, and responsive frontend dashboard designed for transport and logistics management. It provides user interfaces for tracking vehicle registries, driver rosters, trip dispatches, maintenance logging, and financial analytics.

The application is built using React, Vite, Bootstrap 5, and Chart.js, designed to communicate with a REST API backend.

---

## 🏗️ Frontend Directory Structure

```
frontend/
├── public/              # Static assets
└── src/
    ├── components/      # Shared components (Sidebar, Headers, LoadingSkeletons)
    ├── context/         # AuthContext (React Context for JWT session state)
    ├── layouts/         # DashboardLayout (Sidebar structure, Theme switcher, Responsive canvas wrapper)
    ├── pages/           # Application views
    │   ├── Login.jsx        # Credentials input with quick-demo shortcuts
    │   ├── Dashboard.jsx    # KPI cards, status charts, and system alerts
    │   ├── Vehicles.jsx     # Vehicle CRUD with search, filter, sorting, and modals
    │   ├── Drivers.jsx      # Driver CRUD with license expiry warnings and safety scores
    │   ├── Trips.jsx        # Dispatch planner with cargo capacity validations
    │   ├── Maintenance.jsx  # Logs scheduling and In Shop status toggles
    │   ├── FuelLogs.jsx     # Refueling transaction logging
    │   ├── Expenses.jsx     # Cost ledger with dual logs/operational cost tabs
    │   ├── Reports.jsx      # Vehicle ROI, fuel efficiency charts, CSV/Print exports
    │   └── Settings.jsx     # User profiles and API status
    ├── services/        # Axios API client setup and routes
    │   └── api.js           # Network wrappers and JWT header interceptors
    ├── index.css        # Premium style tokens, animations, and status badge designs
    ├── App.jsx          # Route configurations (React Router)
    └── main.jsx         # App mount point with Bootstrap framework imports
```

---

## ⚡ Tech Stack & Dependencies

- **Framework**: React 19 (scaffolded with Vite)
- **Styling**: Bootstrap 5 + Bootstrap Icons
- **Routing**: React Router DOM (Declarative routing/protected route wrappers)
- **Form Handling**: React Hook Form
- **Network Client**: Axios (configured with local storage JWT injection and interceptors)
- **Data Visualizations**: Chart.js + React Chartjs 2

---

## 🚀 Setup & Installation

### Prerequisites
Ensure you have **Node.js** (v18 or higher) installed on your machine.

### Installation Steps
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Vite local development server:
   ```bash
   npm run dev
   ```
   *By default, the application will serve at **`http://localhost:5173/`**.*

4. Build production bundle (Optional):
   ```bash
   npm run build
   ```

---

## 🛠️ Key UI/UX Implementations

1. **Light/Dark Mode Toggler**: Synergized with CSS variables inside `index.css` and persists theme selections inside LocalStorage.
2. **Dynamic KPI Cards**: Animated dashboard stats measuring fleet utilization, cost, and capacity.
3. **Form Validations**:
   - Cargo weight validator warns users if load limits exceed the selected vehicle's capacity.
   - Driver assigner locks out suspended and expired license holders.
4. **Interactive Filters**: Quick filters for vehicle types, driver statuses, and expense categories.
5. **Data Exports**:
   - **CSV Export**: Compiles fleet metrics and downloads them locally.
   - **Print Report**: Exposes print stylesheets (`@media print` rules) which hide sidebar menus to produce clean PDF summaries.
