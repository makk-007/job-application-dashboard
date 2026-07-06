-- Adds a free-text location field to applications (e.g. "Austin, TX", "London, UK").
-- Safe to run on an existing database; no-op if the column already exists.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';