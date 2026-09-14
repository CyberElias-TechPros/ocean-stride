CREATE TABLE idempotency_keys (
 organization_id TEXT NOT NULL REFERENCES organizations(id),
 key TEXT NOT NULL,
 request_hash TEXT NOT NULL,
 response_id TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 PRIMARY KEY(organization_id,key)
);
CREATE INDEX idempotency_expiry ON idempotency_keys(expires_at);
