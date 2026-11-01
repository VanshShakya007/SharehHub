-- ==============================================================================
-- ShareHub Seed Data (Development & Demo Setup)
-- Passwords for all sample users: "Password123!" (hashed with bcrypt 10 rounds)
-- ==============================================================================

-- 1. SEED USERS
-- Password hash for 'Password123!' is $2a$10$vY3PZtwW1Z9BqYq57qgH1uO4b9M6z0rK8WJ1R3eK3p0L0x6iF6X32 (or generated on init)
INSERT INTO users (id, name, email, password_hash, role, department, quota_limit)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Alice Chen (Student)', 'alice@campus.edu', '$2b$10$EP0qI4O07iXk4n.dG2ZteOGhW58UaN156mQk7kS2YxNn4/Wl/h0p6', 'Student', 'Computer Science', 2),
    ('22222222-2222-2222-2222-222222222222', 'Dr. Bob Miller (Researcher)', 'bob@lab.edu', '$2b$10$EP0qI4O07iXk4n.dG2ZteOGhW58UaN156mQk7kS2YxNn4/Wl/h0p6', 'Researcher', 'Electrical Engineering', 5),
    ('33333333-3333-3333-3333-333333333333', 'Carol Vance (Manager)', 'carol@facility.edu', '$2b$10$EP0qI4O07iXk4n.dG2ZteOGhW58UaN156mQk7kS2YxNn4/Wl/h0p6', 'Manager', 'Central Instrumentation Facility', 10),
    ('44444444-4444-4444-4444-444444444444', 'Dave Wright (Admin)', 'dave@admin.campus.edu', '$2b$10$EP0qI4O07iXk4n.dG2ZteOGhW58UaN156mQk7kS2YxNn4/Wl/h0p6', 'Admin', 'Information Technology', 20),
    ('55555555-5555-5555-5555-555555555555', 'Elena Rostova (Auditor)', 'elena@compliance.edu', '$2b$10$EP0qI4O07iXk4n.dG2ZteOGhW58UaN156mQk7kS2YxNn4/Wl/h0p6', 'Auditor', 'Internal Audit Office', 1)
ON CONFLICT (email) DO NOTHING;

-- 2. SEED PREREQUISITES
INSERT INTO prerequisites (id, code, name, description, validity_days)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'GEN_LAB_SAFETY', 'General Laboratory Safety Level 1', 'Mandatory safety protocol training for all lab equipment.', 365),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'HIGH_VOLTAGE_CERT', 'High Voltage & Power Electronics Certification', 'Required for equipment handling > 50V AC or DC power.', 180),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'LASER_SAFETY_CLASS4', 'Class 4 Laser Operation Clearance', 'Mandatory for high-power laser and optical benches.', 365)
ON CONFLICT (code) DO NOTHING;

-- 3. SEED USER CERTIFICATIONS
-- Give Dr. Bob all certifications, and Alice only General Lab Safety
INSERT INTO user_certifications (user_id, prerequisite_id, expires_at, is_valid)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW() + INTERVAL '300 days', true),
    ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NOW() + INTERVAL '365 days', true),
    ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NOW() + INTERVAL '180 days', true),
    ('22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NOW() + INTERVAL '240 days', true)
ON CONFLICT (user_id, prerequisite_id) DO NOTHING;

-- 4. SEED ASSETS
INSERT INTO assets (id, asset_tag, name, category, description, location, status, qr_code_payload, priority_tier, specs)
VALUES
    ('99999999-0001-0000-0000-000000000001', 'SH-OSC-401', 'Keysight 4-Channel Mixed Signal Oscilloscope', 'Electronics', '200 MHz Bandwidth, 2 GSa/s, 16 Digital Channels', 'Room 304 - Electronics Workbench A', 'Available', 'SHAREHUB-ASSET:99999999-0001-0000-0000-000000000001', 2, '{"channels": 4, "bandwidth": "200MHz", "calibrated": true}'::jsonb),
    ('99999999-0002-0000-0000-000000000002', 'SH-GPU-801', 'NVIDIA DGX A100 Server Node', 'Computing', 'Dedicated 8x A100 80GB SXM4 for Deep Learning Workloads', 'Server Room Rack 12B', 'Available', 'SHAREHUB-ASSET:99999999-0002-0000-0000-000000000002', 5, '{"gpus": 8, "vram": "640GB", "interconnect": "NVLink"}'::jsonb),
    ('99999999-0003-0000-0000-000000000003', 'SH-PRT-301', 'Markforged Mark Two Industrial 3D Printer', 'Fabrication', 'Continuous carbon fiber reinforcement composite 3D printer', 'Maker Hub Bay 2', 'Available', 'SHAREHUB-ASSET:99999999-0003-0000-0000-000000000003', 3, '{"layer_height": "0.1mm", "materials": ["Onyx", "Carbon Fiber"]}'::jsonb),
    ('99999999-0004-0000-0000-000000000004', 'SH-LSR-101', 'Coherent Ti:Sapphire Ultrafast Laser System', 'Optics', 'Tunable femtosecond pulsed laser for nonlinear optics research', 'Laser Darkroom L-14', 'Available', 'SHAREHUB-ASSET:99999999-0004-0000-0000-000000000004', 5, '{"wavelength": "680-1080nm", "pulse_width": "<100fs"}'::jsonb)
ON CONFLICT (asset_tag) DO NOTHING;

-- Map prerequisites to assets
-- High Voltage & Laser for Ti:Sapphire Laser
INSERT INTO asset_prerequisites (asset_id, prerequisite_id)
VALUES
    ('99999999-0001-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    ('99999999-0004-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    ('99999999-0004-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ('99999999-0004-0000-0000-000000000004', 'cccccccc-cccc-cccc-cccc-cccccccccccc')
ON CONFLICT (asset_id, prerequisite_id) DO NOTHING;

-- 5. GENESIS HASH-CHAIN AUDIT BLOCK
INSERT INTO audit_logs (sequence_id, id, timestamp, event_type, actor_id, entity_name, entity_id, payload, prev_hash, current_hash)
VALUES (
    1,
    '00000000-0000-0000-0000-000000000001',
    CURRENT_TIMESTAMP,
    'SYSTEM_GENESIS_INITIALIZED',
    '44444444-4444-4444-4444-444444444444',
    'system',
    'SHAREHUB-CORE',
    '{"message": "ShareHub institutional asset governance ledger initialized with cryptographic root"}'::jsonb,
    '0000000000000000000000000000000000000000000000000000000000000000',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
)
ON CONFLICT (sequence_id) DO NOTHING;
