# TransitOps React Console Client

This is the React 19 + Vite frontend client for the **TransitOps Smart Transport Operations Platform**.

---

## 🎨 Design System & Visual Direction
* **Theme**: Premium dark-navy telemetry-style dashboard (`#080c14` base background, `#0f172a` panels, `#1e293b` cards) with warm amber/gold accents (`#f59e0b`).
* **Fonts**: `Space Grotesk` & `Sora` for telemetry statistics, indicators, and large counters; `Inter` for body copy, text fields, and tables.
* **Layout**: Responsive flex-grid template with a sticky sidebar, top bar user context badges, and responsive tables.
* **Animations**: Pulse glow states for live dispatch trips (`On Trip`), slide-in hover transitions for buttons, card expansions, and metrics cards.

---

## 📂 Implementation Details

We implemented the following page components in the [client/src/pages](file:///d:/odoo/client/src/pages) directory:

1. **Login Portal ([Login.jsx](file:///d:/odoo/client/src/pages/Login.jsx))** (Screen 0)
   * Left dark-navy brand panel showcasing the platform features.
   * Right sign-in form taking email, password, and a **Role** selector.
   * Built-in shortcut profiles for all 4 demo roles (`manager`, `dispatcher`, `safety`, `finance`) for quick credentials filling.
   * Lockout alert messages linked to server-side failed login limits.

2. **Dashboard Overview ([Dashboard.jsx](file:///d:/odoo/client/src/pages/Dashboard.jsx))** (Screen 1)
   * 7 real-time KPI metrics cards: Active Fleet, Available, On-Trip, In Maintenance, Active Dispatches, Pending Orders, and Fleet Utilization %.
   * Search & Status filters for recent dispatches.
   * Horizontal multi-segment progress bar representing the proportions of vehicles (Available / On Trip / In Shop / Retired) with legends.
   * Safety watch-list alert container highlighting expired commercial licenses.

3. **Vehicle Registry ([Vehicles.jsx](file:///d:/odoo/client/src/pages/Vehicles.jsx))** (Screen 2)
   * Detailed data table displaying model type, license registration numbers, load limits, mileage, acquisition budgets, and statuses.
   * Search input + status filters.
   * Pop-up form modal for registering or editing vehicles.
   * Role validation (adding/updating restricted to **Fleet Managers**).

4. **Drivers Registry & Safety ([Drivers.jsx](file:///d:/odoo/client/src/pages/Drivers.jsx))** (Screen 3)
   * Table displaying names, categories (LMV/HMV), DL expiration, safety score metrics, and operator statuses.
   * Smart licensing verification: highlights expired driving licenses.
   * Profile adding/modifying modal (restricted to **Safety Officers**).

5. **Trip Dispatcher ([Trips.jsx](file:///d:/odoo/client/src/pages/Trips.jsx))** (Screen 4)
   * Multi-state stepper layout showing the flow: Draft ➔ Dispatched ➔ Completed/Cancelled.
   * **Create Trip Form**: Select source, destination, available vehicles, and operators.
     * *Live capacity guardrail*: As cargo weight is input, compares it against the selected vehicle's max capacity. If cargo exceeds limit, blocks the planning process and shows warning.
   * **Active Board**: Shows live delivery cards.
     * Includes "Complete" action which opens a modal to log odometer, fuel used, and revenue billed, returning both vehicle and driver to available status.

6. **Maintenance Logs ([Maintenance.jsx](file:///d:/odoo/client/src/pages/Maintenance.jsx))** (Screen 5)
   * Servicing logs table representing cost budgets, dates, and technicians' notes.
   * Adding active logs flips the selected vehicle to "In Shop" downtime.
   * Mark Completed closes the repair sheet and returns the asset to service.

7. **Fuel & Expenses Ledger ([Expenses.jsx](file:///d:/odoo/client/src/pages/Expenses.jsx))** (Screen 6)
   * Dual-tab layout separating Refuel records and operational cost items.
   * Interactive modal forms for logging fuel or tolls.
   * Bottom banner detailing rolled-up costs: Fuel + Maintenance + Tolls + Misc.

8. **Reports & Analytics ([Analytics.jsx](file:///d:/odoo/client/src/pages/Analytics.jsx))** (Screen 7)
   * Real-time metrics counters (Fuel efficiency, Utilization %, Overheads, Revenue).
   * **Monthly Revenue Bar Chart** (built using Recharts).
   * **Top 5 Costliest Vehicles Stacked Bar Chart** (distinguishing fuel from repairs).
   * Lifetime ROI ledger for each vehicle (`(Revenue - Overhead) / Acquisition`).
   * Browser-native CSV downloader exporting the ROI data table.

9. **Settings & RBAC matrix ([Settings.jsx](file:///d:/odoo/client/src/pages/Settings.jsx))** (Screen 8)
   * General configurations (Depot name, local currency symbol, distance units).
   * Access Permission Matrix grid detailing user role scopes.

---

## 🛠️ Run & Launch
Start development build from root directory:
```bash
npm run dev
```
Vite dev server compiles scripts and maps backend API requests via the proxy rule defined in [vite.config.js](file:///d:/odoo/client/vite.config.js).
