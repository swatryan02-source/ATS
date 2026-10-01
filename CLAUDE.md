# HireFlow ATS

Multi-tenant applicant tracking system for Singapore SMEs with high-volume frontline hiring (F&B, retail). The full spec is `docs/PRD.md`. Read the section for the current phase before writing code. Acceptance criteria AC-01 to AC-15 in PRD section 15 are the test specs: every one becomes an automated test.

## Stack (do not swap without asking)

- Next.js (App Router) + TypeScript strict mode
- Supabase: Postgres, Auth (magic link + Google/Microsoft), Storage (private buckets), Row-Level Security
- Database changes only through SQL migrations in `supabase/migrations/` (Supabase CLI). Never edit the DB by hand.
- Tailwind + shadcn/ui for UI, Recharts for dashboard charts
- Form rendering: SurveyJS `survey-core` + `survey-react-ui` (MIT). Do not build a form renderer from scratch.
- Background jobs: Inngest (notifications, retries, retention purges, AI calls)
- Tests: Vitest (unit), Playwright (e2e), pgTAP via `supabase test db` (RLS and constraints)
- Hosting target: Singapore region (Supabase ap-southeast-1, Vercel sin1)

## Commands

- `pnpm dev` / `pnpm build` / `pnpm typecheck` / `pnpm lint`
- `pnpm test` (Vitest) / `pnpm test:e2e` (Playwright)
- `supabase start` / `supabase db reset` (re-runs migrations + seed) / `supabase test db`

Run `pnpm typecheck && pnpm test && supabase test db` before saying a task is done.

## Data model rules

- Every table has `tenant_id uuid not null` and an RLS policy. No exceptions, including lookup tables.
- Candidate and Application are separate tables. One candidate, many applications.
- Dedupe candidates on normalised phone (E.164, default +65), then lowercased email.
- Application status changes are written to `application_status_history` (from, to, actor, reason, at). Reports read status history, never only the current status column.
- Form submissions store `form_version_id` and the raw answers as JSONB; screening-tagged answers are also copied to typed columns.
- `audit_log` is append-only: no UPDATE or DELETE grants, enforced in a migration.
- Soft-delete is not PDPA erasure. Erasure removes personal fields and storage objects; aggregates stay.

## Security and PDPA rules

- Tenant and location scope come from the authenticated session, never from request params or the client.
- Hiring managers see only applications for their assigned jobs and locations. Test this in pgTAP.
- Never log request bodies, candidate names, phones, emails or CV text. Log IDs only.
- Do not add fields for NRIC/FIN, date of birth, race, religion, marital status or photo to any default form.
- Screening rules must not reference nationality, age, race, religion or gender. The rule builder warns on these.
- Documents live in private storage; serve with signed URLs that expire in 15 minutes.
- Seed and test data are fake. Never paste real candidate data into this repo or into prompts.

## Workflow engine rules

- Workflows are data (trigger, conditions, actions) in tables, not code.
- Every external action has an idempotency key `(rule_id, application_id, event_id)`.
- External actions retry 3 times (1, 5, 30 min) via Inngest, then mark Failed and alert the recruiter.
- A failed action never rolls back a status change.
- Max cascade depth 5.
- AI results never set status to Rejected unless the job has `ai_auto_reject = true`.

## Working style

- One PRD phase per session. Start in plan mode, show the plan, wait for approval, then build.
- Write the migration and pgTAP tests first, then server code, then UI.
- Small commits with clear messages after each passing step.
- Ask before adding a dependency not listed above.
- If the PRD is ambiguous, ask; don't invent business rules.
- UI copy: plain English, short. Candidate-facing screens must work on a 375px-wide phone.
