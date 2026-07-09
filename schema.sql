-- Grand Migration global layer (D1)
CREATE TABLE IF NOT EXISTS racers (
  name_key   TEXT PRIMARY KEY,          -- normalized upper-case name
  name       TEXT NOT NULL,             -- display form as claimed
  token      TEXT NOT NULL,             -- device secret issued at claim
  recruiter  TEXT,                      -- name_key of the racer whose link recruited this one
  claimed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS entries (
  day      TEXT NOT NULL,               -- YYYY-MM-DD (UTC race day)
  name_key TEXT NOT NULL,
  position INTEGER NOT NULL,            -- canonical: field of 400 procedural + this racer alone
  field    INTEGER NOT NULL,
  pts      INTEGER NOT NULL,
  PRIMARY KEY (day, name_key)
);
CREATE INDEX IF NOT EXISTS idx_entries_day ON entries(day);
CREATE INDEX IF NOT EXISTS idx_racers_recruiter ON racers(recruiter);
