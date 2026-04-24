CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    account VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    org_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE datasets (
  id SERIAL PRIMARY KEY,
  org_id TEXT,
  name TEXT,
  type TEXT,
  source TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE analysis_results (
    id SERIAL PRIMARY KEY,
    dataset_ids JSONB,
    question TEXT,
    result TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
