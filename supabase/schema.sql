-- ============================================================
-- Job Application Tracker - Supabase Schema
-- Run this in the Supabase SQL Editor
--
-- This schema is delivered in full as part of Batch 1 so the database only
-- needs to be set up once. Tables used by later batches (contacts,
-- interviews, documents, offers) are created now but the application code
-- that reads/writes them ships in their respective batches.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- JOB SEARCH ROUNDS TABLE
-- ============================================================
-- Optional grouping for a distinct search effort (e.g. "2026 Spring Search").
-- Analogous to application_cycles in the university tracker. Most users
-- will only ever have one round; power users running multiple distinct
-- searches over time can separate them.
CREATE TABLE IF NOT EXISTS job_search_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active round per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS one_active_round_per_user
  ON job_search_rounds(user_id) WHERE (is_active);

-- ============================================================
-- COMPANIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTACTS TABLE
-- ============================================================
-- Full CRUD for this table ships in Batch 3. Created now so applications
-- can reference a referral contact from Batch 1 onward.
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  relationship TEXT NOT NULL DEFAULT 'other'
    CHECK (relationship IN ('recruiter','referral','interviewer','other')),
  last_contacted_at DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPLICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_id UUID REFERENCES job_search_rounds(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  role_title TEXT NOT NULL,
  job_post_url TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'job board'
    CHECK (source IN ('referral','job board','recruiter','company site','networking','other')),
  work_type TEXT NOT NULL DEFAULT 'onsite'
    CHECK (work_type IN ('onsite','remote','hybrid')),
  relocation_required BOOLEAN NOT NULL DEFAULT FALSE,
  relocation_sponsored BOOLEAN NOT NULL DEFAULT FALSE,
  salary_min NUMERIC(12, 2),
  salary_max NUMERIC(12, 2),
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'lead'
    CHECK (status IN ('lead','applied','screening','interviewing','offer','rejected','withdrawn')),
  applied_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPLICATION_CONTACTS (junction table)
-- ============================================================
-- An application can involve multiple contacts (recruiter, referrer,
-- interviewers) beyond the single primary contact_id on applications.
-- Full CRUD ships in Batch 3.
CREATE TABLE IF NOT EXISTS application_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role_in_process TEXT DEFAULT '',
  UNIQUE (application_id, contact_id)
);

-- ============================================================
-- CHECKLIST TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INTERVIEWS TABLE
-- ============================================================
-- Full CRUD ships in Batch 4.
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  round_type TEXT NOT NULL DEFAULT 'other'
    CHECK (round_type IN ('phone_screen','technical','behavioral','onsite','final','other')),
  scheduled_at TIMESTAMPTZ,
  interviewer_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  outcome TEXT NOT NULL DEFAULT 'pending'
    CHECK (outcome IN ('pending','passed','failed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTS TABLE
-- ============================================================
-- Full CRUD ships in Batch 5.
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'other'
    CHECK (type IN ('resume','cover_letter','portfolio','other')),
  name TEXT NOT NULL,
  version_label TEXT DEFAULT '',
  file_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPLICATION_DOCUMENTS (junction table)
-- ============================================================
CREATE TABLE IF NOT EXISTS application_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  UNIQUE (application_id, document_id)
);

-- ============================================================
-- OFFERS TABLE
-- ============================================================
-- Full CRUD ships in Batch 5.
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  base_salary NUMERIC(12, 2),
  bonus NUMERIC(12, 2),
  equity TEXT DEFAULT '',
  signing_bonus NUMERIC(12, 2),
  benefits_notes TEXT DEFAULT '',
  currency TEXT DEFAULT 'USD',
  decision_deadline DATE,
  decision TEXT NOT NULL DEFAULT 'pending'
    CHECK (decision IN ('pending','accepted','declined')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STATUS HISTORY TABLE
-- ============================================================
-- Records every status change for an application.
CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS status_history_application_idx
  ON status_history(application_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER job_search_rounds_updated_at
  BEFORE UPDATE ON job_search_rounds
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER interviews_updated_at
  BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Job Search Rounds
ALTER TABLE job_search_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own job search rounds"
  ON job_search_rounds FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own companies"
  ON companies FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own contacts"
  ON contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own applications"
  ON applications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Application_Contacts
ALTER TABLE application_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their application-contact links"
  ON application_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_contacts.application_id
        AND a.user_id = auth.uid()
    )
  );

-- Checklist
ALTER TABLE checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage checklist for their applications"
  ON checklist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = checklist.application_id
        AND a.user_id = auth.uid()
    )
  );

-- Interviews
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage interviews for their applications"
  ON interviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = interviews.application_id
        AND a.user_id = auth.uid()
    )
  );

-- Documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own documents"
  ON documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Application_Documents
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their application-document links"
  ON application_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_documents.application_id
        AND a.user_id = auth.uid()
    )
  );

-- Offers
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage offers for their applications"
  ON offers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = offers.application_id
        AND a.user_id = auth.uid()
    )
  );

-- Status History
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own status history"
  ON status_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_company_id ON applications(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_round_id ON applications(round_id);
CREATE INDEX IF NOT EXISTS idx_applications_contact_id ON applications(contact_id);
CREATE INDEX IF NOT EXISTS idx_job_search_rounds_user_id ON job_search_rounds(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_application_id ON checklist(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_application_id ON interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_offers_application_id ON offers(application_id);
CREATE INDEX IF NOT EXISTS idx_status_history_user_id ON status_history(user_id);
CREATE INDEX IF NOT EXISTS idx_status_history_application_id ON status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_application_contacts_application ON application_contacts(application_id);
CREATE INDEX IF NOT EXISTS idx_application_contacts_contact ON application_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_application_documents_application ON application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_application_documents_document ON application_documents(document_id);