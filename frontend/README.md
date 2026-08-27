# Phase 4: Modern Responsive Frontend & Role-Based Dashboards

The **MPLADS AI Frontend** is a modern, responsive Single-Page Application (SPA) built using **React 18 (Vite)**, **Tailwind CSS**, **Lucide React**, **Leaflet.js / React-Leaflet**, and **Recharts**. It provides a civic-tech interface with dark/light mode and 4 specialized role-based views.

---

## 1. Directory Structure

```
frontend/
├── index.html                  # HTML entrypoint with Inter font & Leaflet CDN
├── package.json                # Dependencies: React 18, Tailwind, Lucide, Leaflet, Recharts
├── vite.config.js              # Vite server & API proxy to port 5000
├── tailwind.config.js          # Dark mode & custom Government palette
├── src/
│   ├── main.jsx                # React root with BrowserRouter, AuthProvider, ThemeProvider
│   ├── App.jsx                 # Routing configuration & protected AppLayout
│   ├── index.css               # Tailwind directives & Leaflet styling
│   ├── context/
│   │   ├── AuthContext.jsx     # Auth state, login/logout, and 1-click Persona Switcher
│   │   └── ThemeContext.jsx    # Dark/light mode theme provider
│   ├── services/
│   │   └── api.js              # Axios client with JWT interceptor & API endpoints
│   ├── components/
│   │   ├── Navbar.jsx          # Header with emblem, search, quick persona dropdown, dark mode
│   │   ├── Sidebar.jsx         # Contextual navigation dynamically filtered by user role
│   │   ├── LeafletMap.jsx      # Interactive GIS India map with 520+ color-coded risk pins
│   │   ├── ProjectCard.jsx     # Responsive project card with progress bar & financial metrics
│   │   ├── RiskBadge.jsx       # Color-coded badges for fraud anomaly types & risk levels
│   │   ├── AnomalyModal.jsx    # 1-Click Forensic Audit Dossier with Gemini AI explanation
│   │   ├── MilestoneModal.jsx  # Collector verification modal to approve/reject claims
│   │   ├── GrievanceModal.jsx  # Citizen social audit & ghost work grievance form
│   │   └── RecommendWorkModal.jsx # MP proposal submission with real-time AI pre-screening
│   └── pages/
│       ├── LoginPage.jsx       # Sign-in with 1-click quick evaluation persona grid
│       ├── MinistryDashboard.jsx  # National view: macro KPIs, GIS map, Recharts spending
│       ├── CollectorDashboard.jsx # DM/DC view: milestone queue, Gemini anomaly panel
│       ├── MPDashboard.jsx        # MP view: budget health, durable asset photo gallery
│       ├── CitizenPortal.jsx      # Citizen view: public search, neighborhood GIS, grievance
│       ├── ProjectsExplorer.jsx   # Filterable grid of all works with search & pagination
│       └── AlertsCenter.jsx       # Dedicated statutory vigilance anomaly center
```

---

## 2. Role-Based Dashboards

### 1. National / Ministry View (`/ministry`)
- **Metric Cards**: Total Sanctioned (₹101.57 Cr), Utilization % (63.2%), Red-Flag Count (78), Active Works (286).
- **Interactive GIS Map**: Complete map of India with 520+ geotagged pins color-coded by risk (Red = Flagged Anomaly, Yellow = Moderate, Green = Healthy). Clicking pins opens the full audit dossier.
- **Cross-State Spending Charts**: Recharts bar chart comparing state-by-state sanction vs disbursement, and area chart of fund utilization velocity.
- **National Vigilance Feed**: Real-time cards for open inquiries with one-click audit dossiers.

### 2. District Authority (DM/DC) View (`/collector`)
- **District Scope**: Focused on Dharwad District (or assigned jurisdiction).
- **Milestone Verification Queue**: Pending milestone claims submitted by agencies with one-click approval / rejection and fund tranche release.
- **Anomaly Alert Panel**: Badges for duplicate works, cost inflation, and Gemini 2.5 Flash executive summaries.

### 3. Member of Parliament (MP) Dashboard (`/mp`)
- **Constituency Entitlement Tracker**: Tracks ₹5.00 Cr annual entitlement against sanctioned and spent funds.
- **Sectoral Allocation Chart**: Pie chart of spending across drinking water, roads, community halls, and sanitation.
- **Recommend New Work**: Button launching the recommendation modal featuring real-time AI duplicate and anomaly pre-screening.
- **Durable Asset Photo Gallery**: Visual showcase of completed community assets with inspection timestamps.

### 4. Public Citizen Transparency Portal (`/citizen`)
- **Public Search**: Search works by constituency, pincode, road, or work category.
- **Interactive Neighborhood Map**: Zoom in on local civil works and verify progress.
- **Social Audit Grievance Reporting**: Form allowing citizens to report stalled, broken, or ghost works directly to District Vigilance.

---

## 3. Quick 1-Click Evaluation Persona Switcher

To enable immediate testing during evaluation without copying and pasting passwords:
- On the **Login Page** (`/login`) or the **Top Navbar**, click the **"Role"** dropdown.
- Select any persona:
  - **Ministry Administrator**: `Shri Rajesh Kumar, IAS` (`admin.ministry@mplads.gov.in`)
  - **District Collector**: `Divya Prabhu G.R.J., IAS` (`collector.dharwad@mplads.gov.in`)
  - **Member of Parliament**: `Pralhad Joshi` (`mp.dharwad@sansad.nic.in`)
  - **Implementing Agency**: `Executive Engineer, PWD` (`agency.pwd@mplads.gov.in`)
  - **Public Citizen Auditor**: `Ramesh Kulkarni` (`citizen.auditor@mplads.gov.in`)
- The app automatically logs in with the official credentials, updates the JWT token, and navigates directly to that role's specialized dashboard!

---

## 4. How to Run the Frontend

```bash
# Navigate to frontend
cd frontend

# Start Vite development server
npm run dev

# Or build for production
npm run build
```
The application will be accessible at `http://localhost:3000`.
