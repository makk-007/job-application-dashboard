-- Adds the "declined" application status: the company made an offer and the
-- user turned it down (distinct from "rejected", where the company turned the
-- application down, and "withdrawn", where the user pulled out before an offer).
--
-- Run this BEFORE deploying the matching application code.
-- Safe to run on an existing database: existing rows already satisfy the new,
-- wider constraint, and re-running it is a no-op in effect.

ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN (
    'lead',
    'applied',
    'screening',
    'interviewing',
    'offer',
    'rejected',
    'withdrawn',
    'declined'
  ));
