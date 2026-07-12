# TransitOps — Smart Transport Operations Platform

TransitOps is a centralized, production-quality full-stack web application designed for transport and logistics operations. It manages vehicle registries, driver rosters, trip dispatch cycles, active maintenance workflows, and operational expenses, providing comprehensive analytics for fleet managers, dispatchers, safety officers, and financial analysts.

---

## 🏗️ Folder Structure

The project is divided into standalone `backend` and `frontend` folders:

```
transitops/
├── backend/
│   ├── config/          # Mongoose DB connection setup
│   ├── controllers/     # Controller logic for all API endpoints (Auth, Trips, Fleet, etc.)
│   ├── middleware/      # JWT Authentication & Role-Based Access Control (RBAC)
│   ├── models/          # MongoDB Schemas (User, Vehicle, Driver, Trip, Maintenance, FuelLog, Expense)
│   ├── routes/          # Express REST API routes
│   ├── utils/           # DB Seeder script (Seeds 12 Vehicles, 8 Drivers, Trips, Maintenance, Fuel Logs, Expenses)
│   ├── .env             # Environment variables configuration
│   └── server.js        # Main Express server entrypoint
└── frontend/
    ├── public/          # Static assets
    └── src/
        ├── components/  # Layouts (Sidebar, Header), Modals, Skeletons
        ├── context/     # AuthContext (JWT session states, Remember Me storage)
        ├── layouts/     # DashboardLayout shell (theme switcher, sticky sidebar)
        ├── pages/       # Dashboard, Vehicles, Drivers, Trips, Maintenance, FuelLogs, Expenses, Reports, Settings, Login
        ├── services/    # Axios HTTP client wrappers
        ├── index.css    # Premium style tokens, animations, and status badge custom classes
        └── main.jsx     # App mount point with Bootstrap imports
```

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** (v18+ recommended)
- **MongoDB** running locally on port `27017`

### 1. Run the Backend Server
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in development mode (starts Nodemon, connects to MongoDB, and automatically runs the DB seeder):
   ```bash
   npm run dev
   ```
   *The server will start on port **5001**.*

### 2. Run the Frontend Development Server
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   *Open **http://localhost:5173** in your browser.*

---

## 🗝️ Demo User Credentials (JWT Auth & Role-Based Write Access)

Log in to test role-based constraints. All accounts share the same password: **`Admin@123`**

| Role | Username / Email | Authorized Modules (Full Access) | Unauthorized Modules (Completely Hidden & Blocked) |
| :--- | :--- | :--- | :--- |
| **Fleet Manager** | `admin@transitops.com` | 🚛 Fleet (Vehicles), 🔧 Maintenance | Dashboard, Trips, Drivers, Fuel, Expenses, Reports |
| **Dispatcher** | `dispatcher@transitops.com` | 📊 Dashboard, 🗺️ Trips | Vehicles, Drivers, Maintenance, Fuel, Expenses, Reports |
| **Safety Officer** | `safety@transitops.com` | 🪪 Drivers | Dashboard, Vehicles, Trips, Maintenance, Fuel, Expenses, Reports |
| **Financial Analyst** | `analyst@transitops.com` | ⛽ Fuel Logs, 💵 Expenses, 📈 Analytics (Reports) | Dashboard, Vehicles, Drivers, Trips, Maintenance |

*Note: Access to unauthorized modules is completely hidden in the sidebar and blocked on both frontend routes (immediate redirects) and backend REST API endpoints.*

---

## 🔒 Security & Account Safeguards

1. **Brute-Force Lockout Protection**: If a user enters invalid credentials **5 times consecutively** during login, the account is temporarily locked for **15 minutes**.
2. **Forgot Password Identity Authentication**: To reset a password, the user must input their registered email address and verify their Full Name case-insensitively. A matching name unlocks the account and updates the password.
3. **Remember Me Option**: Optional checkbox on the login page allows users to save credentials locally. Details automatically pre-fill when they load the login page.

---

## ⚙️ Mandatory Business Rules Enforced

1. **Unique Registrations**: Vehicle Registration Numbers and Driver License Numbers are validated for uniqueness.
2. **Dispatch Blocks**: Retired or "In Shop" vehicles cannot be dispatched. Drivers with expired licenses or "Suspended"/"Off Duty" status cannot be assigned.
3. **Trip Scheduling Limit**: A driver or vehicle already marked "On Trip" cannot be assigned to another active trip.
4. **Cargo Limits**: Cargo weight must never exceed the assigned vehicle's maximum load capacity.
5. **Auto-Status Transitions**:
   - Dispatching a trip changes vehicle and driver statuses to `On Trip`.
   - Completing a trip changes vehicle and driver statuses back to `Available`.
   - Cancelling a dispatched trip restores vehicle and driver statuses to `Available`.
6. **Maintenance Workflows**:
   - Starting a maintenance task automatically flags the vehicle status as `In Shop` (hiding it from dispatch selectors).
   - Closing maintenance restores the vehicle status to `Available` (unless retired) and automatically logs a corresponding Maintenance Expense.
7. **Fuel Logging Integration**: Completing a trip with fuel data or creating a fuel log automatically logs a Fuel Expense and computes average Fuel Efficiency (`Distance Covered / Fuel Quantity`).

---

## 📊 Analytics and Exporting

- **Operational Costs**: Automatically aggregates fuel costs, maintenance tasks, repairs, insurance, and tolls grouped by vehicle.
- **ROI Tracking**: Calculates `[Estimated Revenue - Total Cost] / Acquisition Cost` for each vehicle.
- **Data Exporting**: Supports client-side CSV downloads of fleet financials and uses tailored styles for print-to-PDF reports.
