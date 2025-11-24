-- PostgreSQL schema with pgcrypto encryption
-- Enable pgcrypto extension for AES-256-GCM
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Master keys table (encrypted with HSM)
CREATE TABLE IF NOT EXISTS master_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name VARCHAR(255) NOT NULL UNIQUE,
    key_material BYTEA NOT NULL, -- Encrypted with HSM
    algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rotated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hsm_attestation JSONB
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL,
    kms_key_id UUID NOT NULL REFERENCES master_keys(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scenarios table (encrypted with per-project KMS key)
CREATE TABLE IF NOT EXISTS scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    data BYTEA NOT NULL, -- AES-256-GCM encrypted
    checksum VARCHAR(64) NOT NULL,
    seed INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit events table (append-only, hash-chained)
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_index BIGSERIAL UNIQUE NOT NULL,
    actor_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- generate, control, export, auth, etc.
    subject_id VARCHAR(255),
    details JSONB,
    prev_hash VARCHAR(64),
    hash VARCHAR(64) NOT NULL UNIQUE,
    signature BYTEA NOT NULL, -- Ed25519
    hsm_notarized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_events_actor ON audit_events(actor_id);
CREATE INDEX idx_audit_events_action ON audit_events(action);
CREATE INDEX idx_audit_events_hash ON audit_events(hash);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    roles JSONB NOT NULL DEFAULT '["operator"]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Encryption helper function
CREATE OR REPLACE FUNCTION encrypt_data(plaintext BYTEA, key UUID)
RETURNS BYTEA AS $$
DECLARE
    master_key BYTEA;
BEGIN
    SELECT key_material INTO master_key FROM master_keys WHERE id = key;
    RETURN encrypt(plaintext, master_key, 'aes');
END;
$$ LANGUAGE plpgsql;

-- Decryption helper function
CREATE OR REPLACE FUNCTION decrypt_data(ciphertext BYTEA, key UUID)
RETURNS BYTEA AS $$
DECLARE
    master_key BYTEA;
BEGIN
    SELECT key_material INTO master_key FROM master_keys WHERE id = key;
    RETURN decrypt(ciphertext, master_key, 'aes');
END;
$$ LANGUAGE plpgsql;
