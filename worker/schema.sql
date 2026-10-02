-- OceanStride D1 schema (adapted from the repo's Prisma init migration,
-- normalized to Worker-friendly conventions: TEXT ids, ISO timestamps, INTEGER booleans).

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  tax_id TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'GUEST',
  is_active INTEGER NOT NULL DEFAULT 1,
  email_verified INTEGER NOT NULL DEFAULT 0,
  last_login TEXT,
  company_id TEXT,
  refresh_token TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vessels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  imo_number TEXT NOT NULL UNIQUE,
  flag TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  year_built INTEGER NOT NULL DEFAULT 0,
  gross_tonnage REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  last_inspection TEXT,
  next_inspection TEXT,
  company_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS seafarers (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  date_of_birth TEXT NOT NULL DEFAULT '',
  nationality TEXT NOT NULL DEFAULT '',
  rank TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  company_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT '',
  number TEXT NOT NULL DEFAULT '',
  issue_date TEXT,
  expiry_date TEXT,
  issue_place TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL DEFAULT '',
  seafarer_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS certifications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '',
  number TEXT NOT NULL DEFAULT '',
  issue_date TEXT,
  expiry_date TEXT,
  issuing_authority TEXT NOT NULL DEFAULT '',
  document_url TEXT NOT NULL DEFAULT '',
  seafarer_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  seafarer_id TEXT NOT NULL,
  vessel_id TEXT NOT NULL,
  rank TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_vessels_imo ON vessels(imo_number);
CREATE INDEX IF NOT EXISTS idx_seafarers_email ON seafarers(email);
CREATE INDEX IF NOT EXISTS idx_seafarers_status ON seafarers(status, is_active);
CREATE INDEX IF NOT EXISTS idx_vessels_status ON vessels(status, is_active);
CREATE INDEX IF NOT EXISTS idx_documents_seafarer ON documents(seafarer_id);
CREATE INDEX IF NOT EXISTS idx_certifications_seafarer ON certifications(seafarer_id);
CREATE INDEX IF NOT EXISTS idx_assignments_seafarer ON assignments(seafarer_id);
CREATE INDEX IF NOT EXISTS idx_assignments_vessel ON assignments(vessel_id);