-- Hardens Row Level Security so a row can only link to other rows the same
-- user owns.
--
-- Before this migration, the policies checked that you own the row you are
-- writing, and (for child tables) the application it belongs to, but not the
-- *other* rows it points at. For example, someone who guessed another user's
-- contact ID could attach it to their own application. They could not read that
-- contact, so this was an integrity gap rather than a data leak, but it should
-- not be possible.
--
-- Links now ownership-checked on write (WITH CHECK):
--   applications.company_id / round_id / contact_id
--   contacts.company_id
--   application_contacts.contact_id
--   application_documents.document_id
--   interviews.interviewer_contact_id
--   status_history.application_id
--
-- Read rules (USING) are unchanged, so what each user can see does not change.
-- No application code changes are needed: the UI only ever links a user's own
-- rows, so these checks only block writes the app cannot produce.
--
-- Run the pre-flight check first (it should return zero rows). It looks for any
-- existing cross-user links, which would make later edits to those rows fail.
--
-- Safe to re-run. Wrapped in a transaction so no table is ever left with RLS
-- enabled and no policy.

BEGIN;

-- Applications ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own applications" ON applications;
CREATE POLICY "Users can manage their own applications"
  ON applications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = applications.company_id
        AND c.user_id = auth.uid()
    )
    AND (
      applications.round_id IS NULL
      OR EXISTS (
        SELECT 1 FROM job_search_rounds r
        WHERE r.id = applications.round_id
          AND r.user_id = auth.uid()
      )
    )
    AND (
      applications.contact_id IS NULL
      OR EXISTS (
        SELECT 1 FROM contacts ct
        WHERE ct.id = applications.contact_id
          AND ct.user_id = auth.uid()
      )
    )
  );

-- Contacts -------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own contacts" ON contacts;
CREATE POLICY "Users can manage their own contacts"
  ON contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      contacts.company_id IS NULL
      OR EXISTS (
        SELECT 1 FROM companies c
        WHERE c.id = contacts.company_id
          AND c.user_id = auth.uid()
      )
    )
  );

-- Application_Contacts -------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their application-contact links" ON application_contacts;
CREATE POLICY "Users can manage their application-contact links"
  ON application_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_contacts.application_id
        AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_contacts.application_id
        AND a.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM contacts ct
      WHERE ct.id = application_contacts.contact_id
        AND ct.user_id = auth.uid()
    )
  );

-- Interviews -----------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage interviews for their applications" ON interviews;
CREATE POLICY "Users can manage interviews for their applications"
  ON interviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = interviews.application_id
        AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = interviews.application_id
        AND a.user_id = auth.uid()
    )
    AND (
      interviews.interviewer_contact_id IS NULL
      OR EXISTS (
        SELECT 1 FROM contacts ct
        WHERE ct.id = interviews.interviewer_contact_id
          AND ct.user_id = auth.uid()
      )
    )
  );

-- Application_Documents ------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their application-document links" ON application_documents;
CREATE POLICY "Users can manage their application-document links"
  ON application_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_documents.application_id
        AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_documents.application_id
        AND a.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = application_documents.document_id
        AND d.user_id = auth.uid()
    )
  );

-- Status History -------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own status history" ON status_history;
CREATE POLICY "Users can manage their own status history"
  ON status_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = status_history.application_id
        AND a.user_id = auth.uid()
    )
  );

COMMIT;
