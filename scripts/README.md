# Phase 1: Database Architecture & Synthetic Ingestion Pipeline

This directory contains the database schema migrations, automated migration runner, and synthetic ingestion pipeline for the **AI-Powered MPLADS Monitoring and Fraud Detection Platform**.

## Technology Stack
- **Database**: Supabase PostgreSQL with `postgis` and `pgvector` extensions
- **Embeddings**: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors)
- **Data Synthesizer**: `Faker`, `pandas`, `numpy`, `psycopg2-binary`
- **Spatial Engine**: PostGIS `GEOMETRY(Point, 4326)` with automatic coordinate synchronization triggers and GiST indexing
- **Vector Search Engine**: pgvector `vector(384)` with HNSW cosine distance indexing

---

## Directory Contents

| File | Purpose |
|------|---------|
| `schema.sql` | Complete PostgreSQL DDL script with extensions, tables, foreign keys, triggers, and indexes. |
| `migrate.py` | Automated migration runner with connection sanitization and verification checks. |
| `seed.py` | Data extractor and synthetic ingestion pipeline with 15% labeled anomaly injection. |
| `requirements.txt` | Python dependencies required for migration and seeding scripts. |
| `README.md` | Complete setup, execution, and verification guide. |

---

## Database Schema Overview

The database contains 6 relational tables with strict foreign keys, domain constraints, and audit flags:

1. **`constituencies`**: Parliamentary constituencies (Lok Sabha & Rajya Sabha), MP details, allocated limit, and total expenditure.
2. **`contractors`**: Registered civil contractors with unique 15-character GSTIN, blacklist flags, and calculated risk scores.
3. **`users`**: System actors across 6 distinct roles: `MINISTRY`, `STATE_NODAL`, `DISTRICT_COLLECTOR`, `MP`, `AGENCY`, `CITIZEN`.
4. **`projects`**: MPLADS development works with:
   - `embedding vector(384)` for semantic title similarity and deduplication.
   - `location GEOMETRY(Point, 4326)` with auto-sync trigger from `latitude` and `longitude`.
   - GiST spatial index and HNSW vector index.
   - Financial, status, and anomaly audit flags (`is_flagged`, `risk_score`).
5. **`milestones`**: Multi-stage progress tracking with claimed %, fund released tranches, inspection notes, and cryptographic image hashes.
6. **`anomaly_logs`**: Ground-truth fraud logs documenting anomaly types, confidence scores (0.0 - 1.0), status, and audit explanations.

---

## Pre-Seeded User Accounts

All pre-seeded user accounts are provisioned with the standard test password:
**`MPLADS@Secure2025!`**

| Role | Name | Email | Jurisdiction |
|------|------|-------|--------------|
| **MINISTRY** | Dr. Rajiv Kumar Verma | `admin.ministry@mplads.gov.in` | National / Union Level |
| **MINISTRY** | Smt. Sunita Rao | `director.ministry@mplads.gov.in` | National / Union Level |
| **STATE_NODAL** | Ramesh Patil, IAS | `nodal.karnataka@mplads.gov.in` | Karnataka |
| **STATE_NODAL** | Vikas Deshmukh, IAS | `nodal.maharashtra@mplads.gov.in` | Maharashtra |
| **STATE_NODAL** | Anil Kumar Jha, IAS | `nodal.bihar@mplads.gov.in` | Bihar |
| **STATE_NODAL** | K. Vijayan, IAS | `nodal.kerala@mplads.gov.in` | Kerala |
| **STATE_NODAL** | Harpreet Singh, IAS | `nodal.punjab@mplads.gov.in` | Punjab |
| **STATE_NODAL** | Alok Ranjan, IAS | `nodal.up@mplads.gov.in` | Uttar Pradesh |
| **DISTRICT_COLLECTOR** | Divya Prabhu G.R.J., IAS | `collector.dharwad@mplads.gov.in` | Dharwad, Karnataka |
| **DISTRICT_COLLECTOR** | Jitendra Papalkar, IAS | `collector.hingoli@mplads.gov.in` | Hingoli, Maharashtra |
| **DISTRICT_COLLECTOR** | Inayat Khan, IAS | `collector.araria@mplads.gov.in` | Araria, Bihar |
| **DISTRICT_COLLECTOR** | N. Devidas, IAS | `collector.kollam@mplads.gov.in` | Kollam, Kerala |
| **DISTRICT_COLLECTOR** | Vineet Kumar, IAS | `collector.faridkot@mplads.gov.in` | Faridkot, Punjab |
| **DISTRICT_COLLECTOR** | Shubhrant Shukla, IAS | `collector.kannauj@mplads.gov.in` | Kannauj, Uttar Pradesh |
| **MP** | Hon'ble Shri Pralhad Joshi | `mp.dharwad@sansad.nic.in` | Dharwad |
| **MP** | Hon'ble Shri Aashtikar Patil | `mp.hingoli@sansad.nic.in` | Hingoli |
| **MP** | Hon'ble Shri Pradeep Kumar Singh | `mp.araria@sansad.nic.in` | Araria |
| **MP** | Hon'ble Shri N. K. Premachandran | `mp.kollam@sansad.nic.in` | Kollam |
| **MP** | Hon'ble Shri Sarabjeet Singh Khalsa| `mp.faridkot@sansad.nic.in` | Faridkot |
| **MP** | Hon'ble Shri Akhilesh Yadav | `mp.kannauj@sansad.nic.in` | Kannauj |
| **AGENCY** | Executive Engineer, PWD | `agency.pwd@mplads.gov.in` | Dharwad Division |
| **AGENCY** | Project Director, DRDA | `agency.drda@mplads.gov.in` | Araria Division |
| **CITIZEN** | Ananya Hegde | `citizen.auditor@mplads.gov.in` | Social Audit Volunteer |
| **CITIZEN** | Rahul Deshmukh | `citizen.vigilance@mplads.gov.in` | Citizen Vigilance |

---

## Anomaly Injection Breakdown (15% Ground Truth)

The seeder generates **520 total projects** with **78 labeled anomalies (exact 15.0%)**:

1. **Ghost Projects (20 projects / 3.8%)**:
   - Disbursed funds: 90% - 99% of total sanction.
   - Physical progress: stalled at < 20% (3% - 17%).
   - Risk score: 0.86 - 0.98.
2. **Cost Overruns (20 projects / 3.8%)**:
   - Sanction amount: 3.5x - 4.5x higher than regional median for identical work types.
   - Risk score: 0.82 - 0.94.
3. **Duplicate Geospatial Works (20 projects / 10 pairs / 3.8%)**:
   - Exact or near-identical coordinates (< 100 meters, typically 15 - 35m).
   - High semantic similarity in project titles (> 90%).
   - Both collision records flagged with cross-referenced audit trails.
   - Risk score: 0.88 - 0.99.
4. **Vendor Cartels (18 projects / 3.5%)**:
   - Monopolization of Dharwad district, where contractor `Apex Infracon Syndicate Pvt Ltd` (GSTIN: `29AABCA9876K1ZP`) is awarded **81.8%** of works (threshold: > 75%).
   - Risk score: 0.79 - 0.92.

---

## How to Run Migrations & Seeder

### 1. Install Dependencies
```bash
pip install -r scripts/requirements.txt
```

### 2. Configure Environment (`.env`)
Ensure `.env` exists in the workspace root or `backend/.env`:
```ini
DATABASE_URL="postgresql://postgres.uotvuysjxajsgtfztycc:Bhagyasri1433@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
HF_TOKEN="your_huggingface_token"
```

### 3. Run Schema Migrations
```bash
python scripts/migrate.py
```

### 4. Run Synthetic Ingestion Pipeline
```bash
python scripts/seed.py
```

### 5. Verify Ingestion with PostgreSQL Queries
```sql
-- 1. Check Total Projects & Flagged Count
SELECT count(*) AS total_projects, 
       count(*) FILTER (WHERE is_flagged = TRUE) AS flagged_anomalies,
       round(100.0 * count(*) FILTER (WHERE is_flagged = TRUE) / count(*), 1) AS anomaly_pct
FROM projects;

-- 2. Check Anomaly Types Breakdown
SELECT anomaly_type, count(*), round(avg(confidence_score)::numeric, 2) AS avg_conf
FROM anomaly_logs
GROUP BY anomaly_type
ORDER BY count(*) DESC;

-- 3. Test PostGIS Spatial Query
SELECT project_code, title, ST_AsText(location) 
FROM projects 
LIMIT 5;

-- 4. Test pgvector Semantic Similarity Query
SELECT p1.title, p2.title, (p1.embedding <=> p2.embedding) AS cosine_distance
FROM projects p1, projects p2
WHERE p1.id != p2.id AND p1.is_flagged = TRUE AND p1.status = 'IN_PROGRESS'
ORDER BY cosine_distance ASC
LIMIT 5;
```
