-- ==============================================================================
-- ShareHub: Institutional Asset Governance Platform
-- Complete PostgreSQL Schema Definition
-- Includes RBAC, Assets, Prerequisites, Bookings, AI Incident Triage, and Hash-Chained Audit Trail
-- ==============================================================================

-- Enable UUID extension & cryptographic functions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Student', 'Researcher', 'Manager', 'Admin', 'Auditor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE asset_status AS ENUM ('Available', 'Requested', 'Reserved', 'InUse', 'UnderMaintenance', 'Decommissioned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Active', 'Completed', 'Overdue', 'Cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_severity AS ENUM ('Cosmetic', 'Functional', 'SafetyCritical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_status AS ENUM ('Reported', 'Triaged', 'InRepair', 'Resolved', 'Closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'Student',
    department VARCHAR(100) NOT NULL,
    quota_limit INT NOT NULL DEFAULT 3,             -- Max simultaneous active bookings
    current_active_bookings INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TEAMS / LABS
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    lead_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    department VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_members (
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, user_id)
);

-- 3. ASSETS TABLE
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_tag VARCHAR(50) UNIQUE NOT NULL,          -- e.g. "SH-LAB-001"
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,                -- e.g. "Oscilloscope", "Server Blade", "GPU Cluster"
    description TEXT,
    location VARCHAR(150) NOT NULL,                -- e.g. "Room 402 - Robotics Lab"
    status asset_status NOT NULL DEFAULT 'Available',
    qr_code_payload VARCHAR(255) UNIQUE NOT NULL,  -- Cryptographic unique payload / token embedded in QR
    qr_code_image_url TEXT,                        -- Data URL or cloud link to generated QR image
    specs JSONB DEFAULT '{}'::jsonb,               -- Arbitrary technical specs
    priority_tier INT DEFAULT 1,                   -- 1 (Standard) to 5 (Critical Resource)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. PREREQUISITES & CERTIFICATIONS (Smart Eligibility Matching)
CREATE TABLE IF NOT EXISTS prerequisites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,              -- e.g. "SAFETY_101", "LASER_CERT_LVL2"
    name VARCHAR(200) NOT NULL,
    description TEXT,
    validity_days INT DEFAULT 365,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS asset_prerequisites (
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    prerequisite_id UUID REFERENCES prerequisites(id) ON DELETE CASCADE,
    PRIMARY KEY (asset_id, prerequisite_id)
);

CREATE TABLE IF NOT EXISTS user_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    prerequisite_id UUID REFERENCES prerequisites(id) ON DELETE CASCADE,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_valid BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (user_id, prerequisite_id)
);

-- 5. BOOKINGS & REQUESTS
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    status booking_status NOT NULL DEFAULT 'Pending',
    purpose TEXT NOT NULL,
    
    -- Priority Scoring Breakdown
    priority_score DECIMAL(5,2) DEFAULT 0.00,      -- e.g. 84.50
    priority_breakdown JSONB DEFAULT '{}'::jsonb,   -- Explainable factors { roleWeight, urgency, pastReliability, projectTier }
    
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Check-in verification
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_in_photo_url TEXT,                        -- Mandatory initial condition image
    check_in_verified_by UUID REFERENCES users(id),
    
    -- Check-out verification
    check_out_time TIMESTAMP WITH TIME ZONE,
    check_out_photo_url TEXT,                       -- Mandatory return condition image
    check_out_verified_by UUID REFERENCES users(id),
    
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. INCIDENT REPORTS (AI Incident Triage)
CREATE TABLE IF NOT EXISTS incident_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    evidence_photo_url TEXT,
    
    -- AI Classification Output
    ai_predicted_severity incident_severity,
    ai_confidence_score DECIMAL(4,3),               -- e.g. 0.942
    ai_triage_rationale TEXT,                       -- Explainable reasoning from AI
    
    -- Final Status & Manager Review
    final_severity incident_severity,
    status incident_status NOT NULL DEFAULT 'Reported',
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. IMMUTABLE HASH-CHAINED AUDIT LOG
-- Every record stores SHA-256(prev_hash || block_index || event_type || actor_id || record_id || payload || timestamp)
CREATE TABLE IF NOT EXISTS audit_logs (
    sequence_id BIGSERIAL PRIMARY KEY,
    id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    event_type VARCHAR(100) NOT NULL,              -- e.g. 'ASSET_CREATED', 'BOOKING_APPROVED', 'CHECK_IN_VERIFIED'
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_name VARCHAR(100) NOT NULL,             -- e.g. 'assets', 'bookings'
    entity_id VARCHAR(100) NOT NULL,               -- Targeted entity UUID/ID
    payload JSONB NOT NULL,                        -- Snapshot of data changes / action context
    prev_hash VARCHAR(64) NOT NULL,                -- Hash of the immediately preceding audit row
    current_hash VARCHAR(64) NOT NULL              -- Cryptographic hash of this entry
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_asset_id ON bookings(asset_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_schedule ON bookings(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_audit_logs_sequence ON audit_logs(sequence_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_user_certifications ON user_certifications(user_id, prerequisite_id);
