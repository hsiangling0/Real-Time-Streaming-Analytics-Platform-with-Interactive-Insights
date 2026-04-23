CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES organizations(id),
  account TEXT
);

CREATE TABLE datasets (
  id SERIAL PRIMARY KEY,
  org_id TEXT,
  name TEXT,
  type TEXT,
  source TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);