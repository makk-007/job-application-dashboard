# Job Application Tracker

A dedicated tool for tracking a job search end to end: leads, applications,
interviews, offers, contacts, and documents, all in one place.

Built as a standalone project using a University Application Tracker as a
design and architecture reference, then adapted and extended for the
job-search workflow specifically.

## Features

**Applications**
Full CRUD with search, filter, sort, and pagination. Detail drawer with
autosaving fields, a 7-stage status lifecycle (lead, applied, screening,
interviewing, offer, rejected, withdrawn) with automatic status history
logging, per-application checklists, bulk select and delete, and
single-item delete with undo. Each application tracks source, work type,
relocation requirements, and salary range.

**Pipeline**
Drag-and-drop Kanban board across all seven statuses, with optimistic
status updates and rollback if a save fails.

**Contacts**
Recruiters, referrals, interviewers, and other contacts, linkable to
companies and to specific applications. Follow-up tracking flags contacts
not touched in 14+ days, surfaced on both the Contacts page and the
Dashboard, with a one-click "mark contacted today" action.

**Interviews**
Round-by-round tracking (phone screen, technical, behavioral, onsite,
final, other) with outcome status (pending, passed, failed, cancelled),
a calendar-grouped list view (Today, Tomorrow, This Week, Past, by month),
and one-click .ics calendar export. Manageable from both a dedicated
page and inline from the Application Detail Drawer.

**Offers**
Side-by-side comparison cards for every offer (base salary, bonus,
signing bonus, equity, benefits, decision deadline), automatically ranked
by estimated total compensation with the highest highlighted. Decision
status (pending, accepted, declined) is editable inline.

**Documents**
A reusable library of resume, cover letter, portfolio, and other document
versions. Each tracks a usage count and can be linked to or unlinked from
any application, so it is always clear which version was sent where.

**Job Search Rounds**
Optional grouping for distinct search efforts (e.g. by season or year).
Applications can belong to a round or to none; the dashboard and
application list can be scoped to one round or to all of them.

**Dashboard**
KPI cards, a pipeline funnel chart, a source-effectiveness breakdown
(response rate by channel), upcoming interviews in the next 7 days,
stale-application and needs-follow-up widgets, and a recent activity feed.

**Settings**
Account info, Job Search Round management (create, set active, archive,
unarchive, delete), browser notification permissions, and data export.

**Notifications**
Opt-in browser notifications, checked periodically while the app is open,
for interviews starting within an hour or within the next 24 hours, stale
applications, and offer decision deadlines within 3 days. Each
notification fires at most once per day to avoid repeat alerts.

**Data Export**
Per-section CSV export (applications, contacts, interviews, offers,
documents) available from each page's header and from Settings, plus a
full JSON backup of everything from Settings.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS v4
- **Backend:** Supabase (Postgres, Auth, Row Level Security)
- **UI:** Radix-based primitives, Framer Motion (motion/react), Sonner toasts, Lucide icons
- **Charts:** Recharts
- **Routing:** React Router v7

## Project Structure

```
src/
  app/
    components/        Shared UI components (Layout, modals, badges, etc.)
      ui/               Low-level primitives (button, dropdown-menu, etc.)
    context/            React context providers (Auth, Theme, Round, UndoableDelete)
    hooks/              Shared hooks (useEscapeKey, useIsMounted)
    lib/                Supabase client and generated table types
    pages/              One file per route (Dashboard, Applications, Pipeline, etc.)
    utils/              Status config, CSV/JSON export, ICS export, notifications
    routes.tsx          Route definitions
    App.tsx             Provider tree and app shell
  services/             Typed Supabase data-access layer, one file per entity
  styles/               Tailwind entrypoint, theme tokens, fonts
supabase/
  schema.sql            Full database schema, RLS policies, triggers, indexes
  seed.sql              Realistic test data covering every feature
```

Each entity (applications, contacts, interviews, offers, documents,
companies, job search rounds) has its own service file in src/services/
responsible for all Supabase reads/writes for that table, including
mapping between the database's snake_case columns and the app's camelCase
types defined in src/app/types.ts.

## Setup

1. Create a Supabase project if you do not already have one.
2. Copy .env.example to .env and fill in your project's URL and anon key:
   ```
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
3. Run supabase/schema.sql in the Supabase SQL Editor. This creates every
   table, RLS policy, trigger, and index the app needs in one pass.
4. Sign up for an account through the app's normal Sign Up flow.
5. Optionally, run supabase/seed.sql (also in the SQL Editor, while
   signed in as that user) to populate realistic test data covering every
   status, source, work type, and edge case across all entities. Safe to
   re-run; it cleans up its own previously seeded rows first.
6. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```
7. Build for production:
   ```bash
   npm run build
   ```

## Database Notes

- All tables are scoped per-user via Row Level Security; no user can read
  or write another user's data.
- Deleting an application cascades to its checklist items, interviews,
  offers, status history, and document/contact links, but does not delete
  the underlying contact or document records themselves, since those are
  meant to be reused across applications.
- applications.updated_at is maintained by a database trigger
  (handle_updated_at) and is the basis for the "stale application"
  detection (21+ days with no status change while in Applied or
  Screening). Any script that needs to backdate this column for testing
  purposes must disable the trigger first; see the pattern used in
  supabase/seed.sql.

## Browser Notifications

Notifications are opt-in and use the native browser Notification API
only, with no push service or backend component. They are checked on a
5-minute interval while the app tab is open and the person is signed in,
and are silently skipped if permission has not been granted or the
browser does not support them.

## License

Personal project. No license specified.
