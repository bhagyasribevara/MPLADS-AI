-- ============================================================================
-- MPLADS Monitoring & Fraud Detection Platform
-- Database Migration Schema: PostgreSQL with PostGIS & pgvector
-- Version: 1.0.0
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Drop Existing Tables (Cascade for clean migration idempotency)
DROP TABLE IF EXISTS anomaly_logs CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS contractors CASCADE;
DROP TABLE IF EXISTS constituencies CASCADE;

-- ============================================================================
-- Table: CONSTITUENCIES
-- Parliamentary constituencies with fund allocations and expenditure
-- ============================================================================
CREATE TABLE constituencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    house_type VARCHAR(50) NOT NULL CHECK (house_type IN ('LOK_SABHA', 'RAJYA_SABHA')),
    mp_name VARCHAR(255) NOT NULL,
    allocated_funds DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (allocated_funds >= 0),
    total_expenditure DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_expenditure >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_constituencies_state ON constituencies (state);
CREATE INDEX idx_constituencies_house_type ON constituencies (house_type);

-- ============================================================================
-- Table: CONTRACTORS
-- Registered vendors and contractors with GSTIN and risk profiles
-- ============================================================================
CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15) UNIQUE NOT NULL CHECK (length(gstin) = 15),
    blacklisted BOOLEAN NOT NULL DEFAULT FALSE,
    risk_score FLOAT NOT NULL DEFAULT 0.0 CHECK (risk_score >= 0.0 AND risk_score <= 1.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contractors_gstin ON contractors (gstin);
CREATE INDEX idx_contractors_risk ON contractors (risk_score DESC);
CREATE INDEX idx_contractors_blacklisted ON contractors (blacklisted);

-- ============================================================================
-- Table: USERS
-- System users spanning ministry, nodal officers, collectors, MPs, agencies, citizens
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (
        role IN ('MINISTRY', 'STATE_NODAL', 'DISTRICT_COLLECTOR', 'MP', 'AGENCY', 'CITIZEN')
    ),
    state VARCHAR(100),
    district VARCHAR(100),
    constituency_id UUID REFERENCES constituencies(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_constituency ON users (constituency_id);
CREATE INDEX idx_users_state_district ON users (state, district);

-- ============================================================================
-- Table: PROJECTS
-- MPLADS development works with geospatial location, semantic vector embedding, and audit flags
-- ============================================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code VARCHAR(100) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    embedding vector(384),
    work_category VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    constituency_id UUID NOT NULL REFERENCES constituencies(id) ON DELETE CASCADE,
    sanction_amount DECIMAL(15, 2) NOT NULL CHECK (sanction_amount >= 0),
    disbursed_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (disbursed_amount >= 0),
    physical_progress_pct INT NOT NULL DEFAULT 0 CHECK (physical_progress_pct >= 0 AND physical_progress_pct <= 100),
    agency_name VARCHAR(255) NOT NULL,
    contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    location GEOMETRY(Point, 4326),
    latitude FLOAT NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude FLOAT NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    status VARCHAR(50) NOT NULL DEFAULT 'RECOMMENDED' CHECK (
        status IN ('RECOMMENDED', 'SANCTIONED', 'IN_PROGRESS', 'COMPLETED', 'STALLED')
    ),
    risk_score FLOAT NOT NULL DEFAULT 0.0 CHECK (risk_score >= 0.0 AND risk_score <= 1.0),
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Location Geometry Auto-sync Trigger
CREATE OR REPLACE FUNCTION sync_project_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_project_location ON projects;
CREATE TRIGGER trg_sync_project_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON projects
FOR EACH ROW
EXECUTE FUNCTION sync_project_location();

-- Spatial GiST Index for Geospatial Proximity Queries
CREATE INDEX idx_projects_location ON projects USING GIST (location);

-- Vector HNSW Index for Fast Cosine Similarity Duplicate Search
CREATE INDEX idx_projects_embedding_hnsw ON projects USING hnsw (embedding vector_cosine_ops);

-- B-tree Indexes for Filtering and Foreign Keys
CREATE INDEX idx_projects_constituency ON projects (constituency_id);
CREATE INDEX idx_projects_contractor ON projects (contractor_id);
CREATE INDEX idx_projects_state_district ON projects (state, district);
CREATE INDEX idx_projects_status ON projects (status);
CREATE INDEX idx_projects_is_flagged ON projects (is_flagged);
CREATE INDEX idx_projects_risk_score ON projects (risk_score DESC);
CREATE INDEX idx_projects_work_category ON projects (work_category);

-- ============================================================================
-- Table: MILESTONES
-- Verification stages, inspections, and fund release tranches
-- ============================================================================
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_name VARCHAR(255) NOT NULL,
    claimed_pct INT NOT NULL CHECK (claimed_pct >= 0 AND claimed_pct <= 100),
    fund_released DECIMAL(15, 2) NOT NULL DEFAULT 0.00 CHECK (fund_released >= 0),
    inspection_notes TEXT,
    image_url TEXT,
    image_hash VARCHAR(64),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_milestones_project_id ON milestones (project_id);
CREATE INDEX idx_milestones_verified ON milestones (verified);

-- ============================================================================
-- Table: ANOMALY_LOGS
-- Detected fraud patterns, duplicates, cost overruns, cartels, and ghost projects
-- ============================================================================
CREATE TABLE anomaly_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    anomaly_type VARCHAR(50) NOT NULL CHECK (
        anomaly_type IN ('DUPLICATE_WORK', 'COST_OVERRUN', 'GHOST_PROJECT', 'VENDOR_MONOPOLY')
    ),
    confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    explanation TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN' CHECK (
        status IN ('OPEN', 'INVESTIGATING', 'RESOLVED')
    ),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_anomaly_logs_project_id ON anomaly_logs (project_id);
CREATE INDEX idx_anomaly_logs_type ON anomaly_logs (anomaly_type);
CREATE INDEX idx_anomaly_logs_status ON anomaly_logs (status);
CREATE INDEX idx_anomaly_logs_confidence ON anomaly_logs (confidence_score DESC);
