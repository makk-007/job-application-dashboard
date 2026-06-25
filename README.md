# Job Application Tracker

Track job applications from first lead through offer in one place.

## Batch 1 scope

This batch delivers the foundation of the app:

- Supabase auth (sign up, sign in, password reset)
- Job Search Rounds (group applications by search effort)
- Companies (auto-created when adding an application)
- Applications: full CRUD, search, filter, sort, pagination
- Application detail drawer with autosave fields
- Status lifecycle with automatic status history logging
- Checklist sub-items per application
- Bulk select and delete with confirmation
- Single-item delete with undo
- Dashboard: KPIs, pipeline funnel chart, stale-application widget, recent activity
- Settings: account info, search round management

Tables for later batches (contacts, interviews, documents, offers) exist in
the schema but have no application code yet. They will be built out in
their respective batches.

## Setup

1. Copy `.env.example` to `.env` and fill in your Supabase project URL and anon key.
2. Run `supabase/schema.sql` in the Supabase SQL editor for your project.
3. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

## Stack

React 18, TypeScript, Vite, Tailwind CSS v4, Supabase (Postgres, Auth, RLS),
Recharts, React Router v7, Sonner, Framer Motion.
