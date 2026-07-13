# TransitOps — Smart Transport Operations Platform

TransitOps is a unified logistics and fleet management console designed to replace spreadsheets-and-logbooks workflows with structured validation rules. It provides role-based workspaces for **Fleet Managers**, **Dispatchers**, **Safety Officers**, and **Financial Analysts**.

---

## 🚀 Getting Started

### 📋 Prerequisites
* **Node.js** (v24.18.0 or newer recommended)
* **NPM** (v11.16.0 or newer recommended)
* **Internet connection** on first launch (to let `mongodb-memory-server` automatically download the in-memory MongoDB binary)

### ⚙️ Installation
To install monorepo and workspace dependencies:
```powershell
# Set path and execution policy if running on restricted PowerShell (Windows)
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process; $env:Path += ";C:\Program Files\nodejs";

# Install workspaces
npm install --legacy-peer-deps
```

### 💻 Running Development Servers
To launch both the Vite-React frontend and Express-Node backend servers concurrently:
```powershell
npm run dev
```
* **Frontend console**: [http://localhost:5173](http://localhost:5173)
* **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## 🔒 Demo Access Roles
Four auth accounts have been pre-seeded. Select a profile on the login portal shortcut to automatically populate these credentials:

| Role Badge | Demo Email | Password | Primary Scopes |
|---|---|---|---|
| **Fleet Manager** | `manager@transitops.com` | `admin123` | Asset CRUD, Maintenance scheduler, general settings |
| **Dispatcher** | `dispatcher@transitops.com` | `admin123` | Trip planning, route dispatches, fuel logs |
| **Safety Officer** | `safety@transitops.com` | `admin123` | Drivers list, safety scoring, licensing validations |
| **Financial Analyst** | `finance@transitops.com` | `admin123` | Cost reports, fuel records, vehicle ROI metrics |

---

## 🧪 Validating Business Rules

A dedicated automated test suite has been built to assert all 10 strict business rules:
1. Vehicle registration number uniqueness.
2. Filter out Retired / In Shop assets from dispatch options.
3. Block dispatching operator with expired DL or Suspended status.
4. Block busy vehicle/driver from secondary concurrent trips.
5. Limit trip cargo weight against vehicle capacity.
6. Toggle status to "On Trip" on active dispatches.
7. Reset statuses to "Available" on trip completions, updating odometer & logging fuel logs.
8. Reset statuses to "Available" on trip cancellations.
9. Toggle vehicle status to "In Shop" on active maintenance logs.
10. Reset vehicle status to "Available" on maintenance completions (unless Retired).

### Running validation suite:
```powershell
node server/test_rules.js
```
All assertions should return `PASS` in console.

---

## 🛠️ Stack Structure
* **Frontend**: React 19, Vite, React Router, Recharts, Lucide Icons, custom Vanilla CSS3 variables stylesheet.
* **Backend**: Node.js, Express, Mongoose, JWT cookie auth.
* **Database**: MongoDB (In-memory, self-booting via `mongodb-memory-server`).
