# Phase 3: Node.js / Express Backend & RBAC Gateway

The **MPLADS REST API Gateway** is a production Node.js & Express service that manages Role-Based Access Control (RBAC), interacts with Supabase PostgreSQL (PostGIS + pgvector), coordinates with the Python FastAPI ML microservice, and provides analytics and GeoJSON endpoints for Leaflet map visualizations.

---

## 1. Directory Structure

```
backend/
├── package.json                # Project dependencies & scripts
├── test_backend.js             # Automated integration test suite (10 test suites)
├── src/
│   ├── app.js                  # Express setup (CORS, Helmet, Morgan, Route Mounting)
│   ├── server.js               # Server entrypoint and DB verification listener
│   ├── config/
│   │   ├── index.js            # Environment settings (PORT, JWT_SECRET, ML_SERVICE_URL)
│   │   └── db.js               # PostgreSQL connection pool with connection sanitization
│   ├── middleware/
│   │   └── auth.js             # JWT verification, PBKDF2/bcrypt hashing, RBAC guards
│   ├── services/
│   │   └── mlClient.js         # Axios bridge to /ml-service (FastAPI on port 8001)
│   ├── controllers/
│   │   ├── authController.js   # Login, registration, profile lookup
│   │   ├── projectController.js# Scoped listing, proposal creation with ML screening
│   │   ├── milestoneController.js # Agency progress upload & Collector approval
│   │   ├── analyticsController.js # Macro KPIs & Leaflet GeoJSON FeatureCollection
│   │   └── alertController.js  # Anomaly investigation & resolution status
│   └── routes/
│       ├── authRoutes.js       # /api/auth
│       ├── projectRoutes.js    # /api/projects
│       ├── milestoneRoutes.js  # /api/milestones
│       ├── analyticsRoutes.js  # /api/analytics
│       └── alertRoutes.js      # /api/alerts
└── README.md                   # Full documentation & API guide
```

---

## 2. Role-Based Access Control (RBAC) Matrix

| Role | Description | Jurisdiction Scope | Allowed Actions |
|------|-------------|--------------------|-----------------|
| **`MINISTRY`** | Union Ministry Administrator | National | Full read/write, policy oversight, alert resolution |
| **`STATE_NODAL`** | State Nodal Officer (IAS) | State-level | State project monitoring, alert status updates |
| **`DISTRICT_COLLECTOR`** | District Collector / Magistrate | District-level | Project review, milestone approval, fund release, alert resolution |
| **`MP`** | Member of Parliament | Parliamentary Constituency | Submit project recommendations, view constituency works |
| **`AGENCY`** | Implementing Public Agency (PWD, DRDA, etc.) | Division / District | Upload milestone progress claims & site inspection photos |
| **`CITIZEN`** | Public Auditor / Citizen | National (Public) | Read-only access to projects, milestones, analytics, and GIS map |

---

## 3. Core API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/login`: Login with email and password (`MPLADS@Secure2025!`); returns JWT token and user info.
- `POST /api/auth/register`: Self-registration (defaults to `CITIZEN` role).
- `GET /api/auth/me`: Authenticated profile lookup with jurisdiction data.

### Projects (`/api/projects`)
- `GET /api/projects`: List projects with automatic RBAC scoping and filters (`state`, `district`, `status`, `is_flagged`, `risk_level`, `search`, pagination).
- `POST /api/projects`: Submit project recommendation (`MP`, `MINISTRY`, `DISTRICT_COLLECTOR`, `AGENCY`). Automatically runs ML duplicate check and anomaly scoring before saving.
- `GET /api/projects/:id`: Full detailed view including milestone ledger, contractor info, and anomaly logs.

### Milestones (`/api/milestones`)
- `POST /api/milestones`: Agency uploads progress and photo (`AGENCY`, `DISTRICT_COLLECTOR`, `MINISTRY`). Calls ML perceptual image hashing (`pHash`) to flag recycled photos.
- `PUT /api/milestones/:id/verify`: District Collector verifies or rejects milestone, releasing sanctioned funds and updating project physical progress.

### Analytics & GIS (`/api/analytics`)
- `GET /api/analytics`: Macro KPIs (total sanctioned, disbursed, fund utilization %, red-flag count, state rankings, district hotspots).
- `GET /api/analytics/geojson`: GeoJSON `FeatureCollection` for interactive Leaflet / Mapbox map rendering.

### Vigilance Alerts (`/api/alerts`)
- `GET /api/alerts`: List open anomalies with project and contractor details.
- `PUT /api/alerts/:id/status`: Mark anomaly as `INVESTIGATING` or `RESOLVED` (`DISTRICT_COLLECTOR`, `STATE_NODAL`, `MINISTRY`).

---

## 4. How to Run

### Install Dependencies
```bash
npm install
```

### Start Server
```bash
npm start
```
Server will start on port `5000` (or `PORT` defined in `.env`).

### Run Automated Integration Test Suite
```bash
npm test
```
Outputs complete test results validating all 10 integration test suites.
