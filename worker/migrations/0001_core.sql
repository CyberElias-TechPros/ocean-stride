PRAGMA foreign_keys = ON;
CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE users (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, salt TEXT NOT NULL);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE vessels (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), name TEXT NOT NULL, imo TEXT NOT NULL, type TEXT NOT NULL, flag TEXT NOT NULL, capacity INTEGER NOT NULL CHECK(capacity BETWEEN 1 AND 500), status TEXT NOT NULL CHECK(status IN ('At sea','In port','Maintenance')), destination TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), UNIQUE(organization_id,imo), UNIQUE(id,organization_id));
CREATE INDEX vessels_org ON vessels(organization_id,created_at);
CREATE TABLE crew (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), name TEXT NOT NULL, email TEXT NOT NULL, rank TEXT NOT NULL, nationality TEXT NOT NULL, certificate_expiry TEXT NOT NULL, vessel_id TEXT, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), UNIQUE(organization_id,email), FOREIGN KEY(vessel_id,organization_id) REFERENCES vessels(id,organization_id) ON DELETE RESTRICT);
CREATE INDEX crew_org ON crew(organization_id,created_at);
CREATE INDEX crew_vessel ON crew(vessel_id);
CREATE TABLE activity (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), message TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX activity_org ON activity(organization_id,created_at DESC);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX rate_expiry ON rate_limits(expires_at);
CREATE TRIGGER crew_capacity_insert BEFORE INSERT ON crew WHEN NEW.vessel_id IS NOT NULL BEGIN
 SELECT CASE WHEN (SELECT count(*) FROM crew WHERE vessel_id=NEW.vessel_id)>=(SELECT capacity FROM vessels WHERE id=NEW.vessel_id) THEN RAISE(ABORT,'Vessel capacity reached') END;
END;
CREATE TRIGGER crew_capacity_update BEFORE UPDATE OF vessel_id ON crew WHEN NEW.vessel_id IS NOT NULL AND NEW.vessel_id IS NOT OLD.vessel_id BEGIN
 SELECT CASE WHEN (SELECT count(*) FROM crew WHERE vessel_id=NEW.vessel_id)>=(SELECT capacity FROM vessels WHERE id=NEW.vessel_id) THEN RAISE(ABORT,'Vessel capacity reached') END;
END;
CREATE TRIGGER vessel_capacity_update BEFORE UPDATE OF capacity ON vessels BEGIN
 SELECT CASE WHEN NEW.capacity<(SELECT count(*) FROM crew WHERE vessel_id=NEW.id) THEN RAISE(ABORT,'Capacity below assigned crew') END;
END;
