# TransitOps

TransitOps is a role-based fleet and transport-operations console. It helps a depot manage vehicles, drivers, trips, maintenance, fuel, expenses, and operational reporting from one web application.

## Features

- Vehicle registry with availability, trip, workshop, and retirement states
- Driver records with licence, safety, and duty-status tracking
- Trip creation, dispatch, completion, and cancellation workflows
- Dispatch checks for vehicle/driver availability, valid licences, and cargo capacity
- Maintenance logging that updates the related vehicle's operational status
- Fuel and expense records, including maintenance-linked costs
- Role-based dashboards and access control for Fleet Managers, Dispatchers, Safety Officers, and Financial Analysts
- JWT authentication using HTTP-only cookies, rate limiting on authentication endpoints, and optional Google sign-in support
- Analytics and depot settings

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Recharts, Lucide |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB or an ephemeral development MongoDB instance |
| Authentication | JWT, bcrypt, cookie-based sessions |

## Project structure

```text
.
├── client/                 # React/Vite application
│   └── src/pages/          # Dashboard, vehicles, trips, maintenance, etc.
├── server/                 # Express API and Mongoose models
│   ├── routes/             # Auth, fleet, trip, expense, analytics, settings APIs
│   ├── models/             # MongoDB schemas
│   ├── scripts/seed.js     # Development data seeder
│   └── test_rules.js       # Business-rule smoke checks
├── .env.example            # Configuration reference
└── package.json            # Workspace scripts
```

## Requirements

- Node.js 20 or later
- npm 9 or later
- Internet access on the first in-memory MongoDB launch, so its binary can be downloaded

## Setup

Install all workspace dependencies from the repository root:

```powershell
npm install
```

Start the frontend and backend together:

```powershell
npm run dev
```

Then open:

- Frontend: http://localhost:5173
- API health check: http://localhost:5000/api/health

## Configuration

Copy the relevant example environment file and set only the values you need. Never commit real credentials.

| Setting | Used by | Purpose |
| --- | --- | --- |
| `PORT` | Server | API port; defaults to `5000` |
| `MONGODB_URI` | Server | MongoDB connection string. If omitted in development, TransitOps starts a temporary in-memory database. |
| `JWT_SECRET` | Server | Required in production; use a long random value. |
| `CLIENT_ORIGINS` | Server | Comma-separated browser origins permitted by CORS. |
| `COOKIE_SECURE` | Server | Set to `true` when the app is served over HTTPS. |
| `GOOGLE_CLIENT_ID` | Server | Enables Google sign-in when configured. |
| `VITE_API_BASE_URL` | Client | Optional API URL; leave empty to use the Vite proxy locally. |
| `VITE_API_PROXY_TARGET` | Client | Local backend target; defaults to `http://localhost:5000`. |

For a persistent local database, put `MONGODB_URI` in `server/.env`. Otherwise, development data is discarded every time the server stops.

## Demo data

When no `MONGODB_URI` is set in development, the server creates these demo accounts automatically:

| Role | Email | Password |
| --- | --- | --- |
| Fleet Manager | `manager@transitops.com` | `admin123` |
| Dispatcher | `dispatcher@transitops.com` | `admin123` |
| Safety Officer | `safety@transitops.com` | `admin123` |
| Financial Analyst | `finance@transitops.com` | `admin123` |

For a fuller reusable development dataset in your configured MongoDB database, run:

```powershell
npm run seed:dev
```

> The seeder clears the TransitOps collections before inserting its sample data. Do not run it against data you need to keep.

## Available commands

```powershell
# Run the complete development environment
npm run dev

# Run only the API
npm run start:server

# Run only the frontend
npm run start:client

# Build the frontend for production
npm run build --workspace=client

# Run client linting
npm run lint --workspace=client

# Run in-memory business-rule smoke checks
npm test --workspace=server
```

## Core operational rules

The application enforces fleet workflow constraints in its API, including:

1. Vehicle registration numbers and driver licence numbers are unique.
2. Only available vehicles and drivers can be dispatched.
3. Suspended or expired-licence drivers cannot be dispatched.
4. A trip's cargo cannot exceed the assigned vehicle's capacity.
5. Dispatching marks the vehicle and driver as **On Trip**.
6. Completing or cancelling a trip releases the vehicle and driver; completion also records closing trip data.
7. Active maintenance marks a vehicle **In Shop**; completed maintenance returns eligible vehicles to **Available**.

## Production notes

Build the client before starting the server in production:

```powershell
npm run build --workspace=client
$env:NODE_ENV = 'production'
npm run start:server
```
DEMO
<img width="800" height="430" alt="TransitOpsSmartTransportOperationsPlatformand5morepages-Personal-Microsoft_Edge2026-07-1216-16-59-ezgif com-video-to-gif-converter" src="https://github.com/user-attachments/assets/12c0f40d-8afb-47bd-a2c2-33d65b5b9d07" />


Production requires both `JWT_SECRET` and `MONGODB_URI`. Configure `CLIENT_ORIGINS` and `COOKIE_SECURE=true` to match the deployment's HTTPS domain.
