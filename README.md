# ShareHub 🛡️
> **Institutional Asset Governance Platform**  
> Built for the National Hackathon based on strict Software Requirements Specifications (SRS).

ShareHub provides auditable, rule-enforced, and cryptographically verified management for high-value university and enterprise lab assets (supercomputing blades, oscilloscopes, optical systems, and fabrication machinery).

---

## 🏛️ System Architecture

```
sharehub/
├── client/                      # React + Tailwind CSS Frontend
│   ├── public/                  # Static assets & index.html
│   ├── src/
│   │   ├── components/          # Reusable UI (Navbar, QR Scanner, Modals, Cards)
│   │   ├── pages/               # View pages (Catalog, ManagerCommandCenter, AuditTrail)
│   │   ├── App.jsx              # Main router & layout container
│   │   ├── index.css            # Tailwind directives & typography
│   │   └── main.jsx             # React entry point
│   ├── package.json
│   ├── vite.config.js           # Vite dev proxy configuration
│   └── tailwind.config.js       # Dark-themed custom palette
│
├── server/                      # Node.js + Express Backend
│   ├── src/
│   │   ├── config/              # Database connection pool (db.js) & schema init (initDb.js)
│   │   ├── controllers/         # Business logic (authController.js, assetController.js)
│   │   ├── db/                  # SQL Schemas (schema.sql, seed.sql)
│   │   ├── middleware/          # RBAC auth (auth.js), photo upload storage (upload.js)
│   │   ├── routes/              # Express API routers (auth, assets, audit)
│   │   ├── utils/               # Hash-chained audit logger, QR code generator
│   │   └── server.js            # Express app entry point & health check
│   ├── uploads/                 # Local object storage simulation for before/after photos
│   ├── package.json
│   ├── .env.example             # Environment variables template
│   └── .env
│
└── README.md                    # System documentation and setup guide
```

---

## ⚙️ Core Technical Pillars

1. **5-Tier Role-Based Access Control (RBAC)**:
   - `Student`: Equipment browsing, booking request submission (quota-limited), QR condition check-in/out.
   - `Researcher`: Elevated equipment quotas and priority weights for high-compute & experimental setups.
   - `Manager`: Incident triage inbox, booking review & override, maintenance scheduling, heatmap analytics.
   - `Admin`: User account lifecycle, asset onboarding, policy prerequisite configuration.
   - `Auditor`: Read-only access to verify cryptographic SHA-256 chain integrity across all historical actions.

2. **Automated QR Generation & Physical Tracking**:
   - Every asset creation automatically yields a unique cryptographic token payload (`SHAREHUB-ASSET:<uuid>`) and high-resolution base64 PNG data URL.
   - Assets can be looked up instantly by asset UUID or scanned QR payload.

3. **Smart Eligibility Matching (Prerequisites)**:
   - Assets can require one or multiple prerequisite certifications (e.g., `GEN_LAB_SAFETY`, `HIGH_VOLTAGE_CERT`, `LASER_SAFETY_CLASS4`).
   - The asset catalog automatically cross-references active user certifications and annotates eligibility in real-time.

4. **SHA-256 Hash-Chained Audit Trail**:
   - Every state change creates an append-only block:  
     $$\text{current\_hash} = \text{SHA-256}(\text{prev\_hash} \parallel \text{sequence} \parallel \text{timestamp} \parallel \text{eventType} \parallel \text{actorId} \parallel \text{entity} \parallel \text{payload})$$
   - An `/api/audit/verify` endpoint verifies the integrity of the entire chain from the genesis block to detect tampering.

5. **Local Object Storage Simulation**:
   - `multer` disk storage configured in `server/uploads/` with mime-type validation and size controls for check-in and check-out condition photos.

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js** (v18+)
- **PostgreSQL** (v14+) running locally or on a managed cloud instance (e.g., Supabase / Neon)

### 1. Database Setup
1. Create a PostgreSQL database:
   ```sql
   CREATE DATABASE sharehub_db;
   ```
2. Update `server/.env` with your PostgreSQL credentials:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sharehub_db
   JWT_SECRET=your_secure_jwt_secret
   ```
3. Initialize the schema and seed demo data:
   ```bash
   cd server
   npm install
   npm run db:init
   ```

### 2. Start the Backend Server
```bash
cd server
npm run dev
# or npm start
```
The server will run at `http://localhost:5000`. Test health: `http://localhost:5000/api/health`.

### 3. Start the Frontend Client
```bash
cd client
npm install
npm run dev
```
The Vite dev server will run at `http://localhost:5173`.

---

## 🔑 Demo Credentials (Pre-seeded)
All pre-seeded demo accounts share the password: `Password123!`

| Role | Email | Permissions |
|---|---|---|
| **Student** | `alice@campus.edu` | Basic asset requests, 2 concurrent item quota |
| **Researcher** | `bob@lab.edu` | Advanced lab access, 5 item quota, laser certified |
| **Manager** | `carol@facility.edu` | Approvals, incident triage, utilization heatmap |
| **Admin** | `dave@admin.campus.edu` | System configuration, asset onboarding |
| **Auditor** | `elena@compliance.edu` | Hash-chain verification and compliance logs |
