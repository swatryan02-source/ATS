# HireFlow ATS: Product Requirements Document

Status: DRAFT v0.2. Every business rule marked **[confirm]** is an assumption chosen to unblock the build. Change it here before the phase that uses it starts. Section numbers are referenced by the build prompts; do not renumber.

## 0. Document conventions

- **FR-nnn** is a functional requirement. **AI-nnn** is an AI requirement. **AC-nn** is an acceptance criterion in section 15 and must become an automated test.
- "Tenant" is one customer company. "Location" is an outlet or branch inside a tenant.
- All times are stored in UTC and displayed in Asia/Singapore.
- MUST / SHOULD follow RFC 2119 meaning.

## 1. Executive Summary

**Product name:** HireFlow.

**Purpose:** One place to take a frontline job applicant from application form to hired, with most screening and messaging automated.

**Business problem:** Singapore F&B and retail SMEs hire in volume and churn fast. Applications arrive through Jotform, Google Sheets, WhatsApp and job portals. Recruiters copy data between tools, reply by hand, lose track of who was contacted, and cannot answer basic questions (how many applied, how long to hire, which outlet is slow).

**Proposed solution:** A multi-tenant web app with a form builder, a candidate database, a rules-based workflow engine, WhatsApp and email messaging, interview scheduling and a metrics dashboard. AI screening is optional and added last.

**Target users:** Recruiters / talent acquisition, outlet hiring managers, tenant administrators, and candidates (who never log in).

**Scope (v1):** Forms, candidate database, workflows and messaging, interviews, dashboard, PDPA controls.

**Out of scope (v1):** Offer letter generation, e-signature, onboarding checklists, payroll or HR system sync, job portal posting, a candidate login or portal, native mobile apps. Offer and Hired are statuses only. **[confirm]**

## 2. Product Objectives

| Objective | Requirement | Success metric |
|---|---|---|
| Reduce manual recruitment work | Automate form → screening → messaging | % of applications reaching a first status without human action; target 70% |
| Improve candidate experience | Simple mobile application flow | Form completion rate; target 60% of starts |
| Improve recruiter efficiency | Single candidate workflow | Median time from application to first contact; target under 1 hour in business hours |
| Give owners answers without spreadsheets | Built-in dashboard | Four reporting questions answered in-app: funnel, time to hire, source, outlet |

Targets are starting points **[confirm]**.

## 3. User Roles, Tenancy and Access

### 3.1 Roles

| Role | Signs in | Can do |
|---|---|---|
| Candidate | No (signed links only) | Apply, upload documents, book or reschedule an interview, view own status, request data access or deletion |
| Recruiter | Yes | Create and publish forms, configure workflows, review and move candidates, message candidates, manage interviews, see all locations granted to them |
| Hiring manager | Yes | See shortlisted applications for assigned jobs and locations only, approve or decline, add notes |
| Tenant admin | Yes | Everything a recruiter can, plus manage users, roles, locations, retention, integrations, view audit log |

Candidates have no membership row. They are reached only through signed, expiring links.

### 3.2 Tenancy rules

- Every business table carries `tenant_id` and has an RLS policy.
- A user may belong to several tenants and switches between them. The active tenant comes from the session, never a request parameter.
- Locations belong to a tenant. A membership is linked to zero or more locations. Zero locations means all locations for recruiter and tenant admin; hiring managers must have at least one.
- Hiring managers see only applications whose job and location they are assigned to. No access to other candidates, the dashboard of other locations or exports.

### 3.3 Permission matrix

| Capability | Recruiter | Hiring manager | Tenant admin |
|---|---|---|---|
| Create/edit/publish forms | Yes | No | Yes |
| Configure workflows | Yes | No | Yes |
| View candidates | Granted locations | Assigned jobs and locations, shortlisted and later | Yes |
| Change status | Yes | Approve/decline in queue only | Yes |
| Export CSV | Yes (role-limited columns) | No | Yes |
| Manage users and roles | No | No | Yes |
| View audit log | No | No | Yes |
| Retention and deletion settings | No | No | Yes |

## 4. End-to-End Product Workflow

```
CREATE FORM → CONFIGURE QUESTIONS → CONFIGURE SCREENING RULES → PUBLISH
→ CANDIDATE APPLIES → VALIDATE DATA → DEDUPE → AUTOMATED SCREENING
→ QUALIFIED: Shortlisted → HIRING MANAGER REVIEW → INTERVIEW → OFFER → HIRED
→ NOT QUALIFIED: Rejected (with reason) or alternative flow (talent pool, other job)
```

### 4.1 Default statuses

New, Screening, Potential, Shortlisted, Interview, Offer, Hired, Rejected, Withdrawn. Tenants may rename or add statuses; the nine defaults map to fixed system categories so reports keep working. **[confirm]**

Rejected and Withdrawn require a reason code. Default reason codes: Not qualified, No response, Failed interview, Salary mismatch, Availability mismatch, Accepted other offer, Changed mind, Duplicate, Other. Tenants may edit the list.

Allowed transitions: any status may move to Rejected or Withdrawn; otherwise forward one step or back to the previous step. Hired is terminal except by tenant admin. **[confirm]**

## 5. Functional Requirements

### FR-001 Create recruitment form

**User:** Recruiter. **Description:** Create a form without technical knowledge.

**Requirements**

1. Click Create Form, enter a form name, select the job.
2. Add questions from a palette: short text, long text, single choice, multiple choice, yes/no, number, date, phone, email, file upload, consent checkbox, dropdown.
3. Mark a question required; mark a question as a screening question (screening tag).
4. Reorder questions by drag or move buttons.
5. Preview as desktop and mobile.
6. Save as draft (autosave every 10 seconds), publish, unpublish, clone.
7. The builder outputs SurveyJS JSON stored as a form version.
8. The builder warns when a label looks like NRIC/FIN, date of birth, race, religion, nationality, marital status or photo (see section 13).

**Acceptance criteria:** AC-01, AC-03.

### FR-002 Public application form

**User:** Candidate.

**Requirements**

1. Published form is served at `/apply/[slug]`, mobile-first, usable at 375px width.
2. Progress is saved in the browser so a refresh does not lose answers.
3. Required questions block submission; errors appear next to the question in plain English.
4. File upload: PDF, DOC, DOCX, JPG, PNG; max 5 MB per file, max 3 files. **[confirm]** Files are virus-scanned before being made available to staff.
5. Rate limit: after 3 submissions from one IP within 1 hour, a Turnstile challenge is required. **[confirm]**
6. Submitting stores answers with `form_version_id`, runs dedupe, creates an application, copies screening-tagged answers to typed columns, and shows a confirmation with an application reference.
7. Unpublished or draft forms return 404.
8. A QR code for each form can be downloaded.
9. Form analytics: views, starts, submits, drop-off by question.

**Acceptance criteria:** AC-02, AC-03.

### FR-003 Candidate dedupe

1. Normalise phone to E.164 with +65 as default country.
2. Match an existing candidate in the same tenant on phone first, then lowercased email.
3. A match adds a new application to the existing candidate; no new candidate is created.
4. Name-only similarity never merges automatically; it creates a row in `merge_review` for a recruiter to decide.
5. Two submissions from the same candidate to the same job within 10 minutes merge into one application, keeping the latest answers.

**Acceptance criteria:** AC-04.

### FR-004 Application status and history

1. Status changes happen through one server action that writes the new status, an `application_status_history` row (from, to, actor, reason, at) and an `audit_log` row in a single transaction.
2. Reports read status history, not only the current status column.
3. Reason code is mandatory for Rejected and Withdrawn.
4. Bulk status change applies the same rules to each application and reports successes and failures separately.

**Acceptance criteria:** AC-10.

### FR-005 Candidate list

1. Server-side pagination, 50 per page. The list MUST load in under 2 seconds with 50,000 candidates.
2. Filters: job, location, status, source, date applied, tag, has document, screening answer, assigned recruiter. Filters live in the URL.
3. Search by name, phone, email.
4. Saved views per user, bulk status change, Kanban toggle.
5. Hiring managers see only what section 3.2 allows.

### FR-006 Candidate profile

1. Tabs: Overview, Application history, Documents, Notes, Messages, Interviews.
2. Timeline merges status history, notes, messages, interview events and audit entries in time order.
3. Documents are stored in a private bucket and opened through a 15-minute signed URL.
4. Notes are visible to recruiters and hiring managers with access; never to candidates.
5. Tags are free text per tenant.

### FR-007 Hiring manager queue

1. Applications in Shortlisted for a hiring manager's jobs and locations appear in their queue.
2. Each item has Approve and Decline (Decline needs a reason). The manager can act from a one-tap link sent by email or WhatsApp, or in the app.
3. Reminder after 24 hours without action, escalation to the recruiter after 48 hours. **[confirm]**
4. Approve moves the application to Interview; Decline moves it to Rejected with the chosen reason.

**Acceptance criteria:** AC-15.

### FR-008 CSV import

1. Import a Jotform or Google Sheets CSV export into candidates and applications with a column-mapping step.
2. Unmapped columns are kept as raw JSON on the application.
3. Dedupe (FR-003) runs on every row; a summary reports created, merged and skipped rows.

## 6. Automated Workflow Engine

Workflows are data in tables, not code.

**Rule shape:** When (trigger) → If (conditions) → Then (actions), with a priority and a `stop_further` flag.

**Triggers:** application submitted, status changed, interview booked, interview marked attended or no-show, no response for N hours, manager queue item overdue.

**Conditions:** operators equals, not equals, greater/less than (and or-equal), contains, in list, is empty. Conditions combine with AND / OR, grouped one level deep.

**Actions:** change status, notify recruiter, send WhatsApp message, send email, create task, assign recruiter, add tag, add to hiring manager queue.

**Example:** IF Willing to work weekends = Yes AND Years of experience >= 1 THEN status = Potential, notify recruiter, send WhatsApp, create interview task.

**Execution rules**

1. Rules run in ascending priority. A rule with `stop_further` halts lower-priority rules for that event.
2. If two matching rules set different statuses, the higher-priority rule wins and the conflict is written to the run log.
3. Every external action has an idempotency key `(rule_id, application_id, event_id)`; a duplicate event never sends twice.
4. External actions retry 3 times at 1, 5 and 30 minutes, then become Failed and the recruiter is alerted.
5. A failed action never rolls back a status change.
6. Cascade depth (a rule's action triggering another rule) is capped at 5; beyond that the chain stops and is logged.
7. Manual override: a recruiter can change a status by hand at any time; automation does not undo it for that event.
8. Audit: each run records the rule, the event, which conditions matched, the actions attempted and the outcomes.
9. Test mode runs a rule against the last 20 applications and shows what would happen without acting.
10. The rule builder warns when a condition references nationality, age, race, religion or gender.

**Acceptance criteria:** AC-05, AC-06, AC-07, AC-08.

## 7. Candidate Management and Interviews

### 7.1 Candidate management

| Function | Requirement |
|---|---|
| Candidate profile | One record per person per tenant |
| Application history | Every application kept; one candidate, many applications |
| Status | Default flow New → Screening → Potential → Shortlisted → Interview → Offer → Hired |
| Documents | CV and supporting files in private storage |
| Notes | Recruiter and hiring manager notes with author and time |
| Screening | Automated rules plus manual override |
| Communication | Full message history per candidate |
| Audit trail | System and user actions recorded |

### 7.2 Interview scheduling

1. Connect Google Calendar or Microsoft 365 by OAuth per interviewer.
2. Availability is set per location with slot length and capacity (candidates per slot).
3. Public booking page by signed link; the interview appears on the interviewer's calendar and the candidate receives an .ics file.
4. A slot can never be double booked. This MUST be enforced by a database constraint or row lock, not application logic alone.
5. Reminders: candidate 24 hours and 2 hours before; interviewer 1 day before.
6. A candidate may reschedule once, up to 4 hours before the slot. **[confirm]**
7. Recruiter marks Attended or No-show; a nudge is sent 12 hours after the slot if unmarked. No-show can trigger a workflow.
8. Show rate (attended ÷ booked) appears on the dashboard.

**Acceptance criteria:** AC-09.

## 8. AI Requirements

AI is optional, off by default, enabled per tenant and per job, and built after rules-based screening has a month of data to compare against.

### AI-001 CV screening

The system shall:

1. Receive the candidate CV.
2. Extract structured data (experience, skills, availability) with protected attributes stripped before the model call: names, photos, nationality, age, gender, race, religion.
3. Compare the data with the job requirements.
4. Return a fit band (Strong, Moderate, Weak, Insufficient info) with supporting reasons.
5. Flag low-confidence and Insufficient info results to a human queue.
6. Store prompt version, model, input hash, fit band and reasons for every result.

### AI-002 Screening answer summary

Summarise free-text screening answers into a short note for the recruiter, with the same stripping, storage and human-review rules as AI-001.

### Rules for all AI

- Weak never maps to Rejected unless the job has `ai_auto_reject = true`.
- AI never takes an irreversible hiring decision unless explicitly configured.
- A monthly bias report compares outcomes by source and location.
- Each tenant can switch AI off; the runbook documents how.

**Acceptance criteria:** AC-11.

## 9. UI/UX Requirements

```
Dashboard
├── Recruitment Forms: Form List, Create Form, Edit Form, Form Analytics
├── Candidates: Candidate List, Candidate Profile, Candidate Timeline
├── Interviews: Calendar, Availability
├── Workflows: Workflow Builder, Workflow History
└── Settings: Users, Locations, Retention, Integrations
```

Every screen specifies: purpose, components, buttons, fields, validation, empty state, error state, loading state, mobile behaviour, permissions.

| Screen | Purpose | Key components | Empty state | Mobile |
|---|---|---|---|---|
| Dashboard | Answer funnel, time to hire, source, outlet questions | KPI tiles, funnel, trend, source and location charts, overdue list; date and location filters saved per user; every tile links to the filtered candidate list | Setup checklist: create a form, publish, share link | Responsive, tiles stack |
| Form List | Manage forms | Table with status, job, submits; create, clone, unpublish | "No forms yet. Create your first form." | Cards |
| Form Builder | FR-001 | Palette, canvas, settings panel, preview toggle, publish validation | Blank canvas with prompt | Builder is desktop-first; preview must show mobile |
| Candidate List | FR-005 | Filters, search, saved views, bulk actions, Kanban toggle | "No candidates match these filters." | Cards, filters in a drawer |
| Candidate Profile | FR-006 | Tabs, timeline, status control, message composer | n/a | Single column |
| Workflow Builder | Section 6 | When / If / Then table, priority, test mode, run history, retry on failure | "No rules yet. Start from a template." | Desktop-first |
| Settings > Users | Admin | Invite, role, locations, deactivate | Owner only | Cards |
| Public form | FR-002 | One question group per screen on mobile, progress bar, consent | n/a | 375px minimum |
| Booking page | Section 7.2 | Slot picker, confirm, reschedule | "No slots available. We will contact you." | 375px minimum |

Copy rule: plain English, short sentences. Loading uses skeletons; errors say what happened and what to do next.

## 10. API / Backend Requirements

The app uses Next.js server actions and route handlers over Supabase. The list below names capabilities, not a public REST contract. A public API is not v1 scope.

| Capability | Route or action |
|---|---|
| Forms | create, list, get, update, publish, unpublish, clone, delete (draft only) |
| Applications | submit (public), list, get, change status, bulk change status |
| Candidates | list, get, merge, timeline |
| Workflows | create, update, enable/disable, test, run history, retry |
| Messaging | send, inbound webhook (delivery status, replies) |
| Interviews | availability, book, reschedule, mark attendance |
| Exports | CSV of any filtered list |
| Privacy | access request, deletion request |

**Cross-cutting**

- Authentication by Supabase Auth; authorisation by RLS plus server checks.
- Validate all input with a schema on the server (zod).
- Webhooks verify signatures and are idempotent.
- Background jobs run on Inngest with retries as in section 6.
- Rate limiting on public endpoints.
- Logging records IDs only, never request bodies or personal data.
- Errors return a stable code and a plain-English message.

## 11. Data Model

```
TENANT
 ├── LOCATION
 ├── PROFILE ← auth.users
 │     └── MEMBERSHIP (role) ── MEMBERSHIP_LOCATION
 ├── JOB
 │     ├── FORM ── FORM_VERSION (SurveyJS JSON)
 │     └── WORKFLOW_RULE ── WORKFLOW_RUN ── WORKFLOW_ACTION_ATTEMPT
 ├── CANDIDATE
 │     ├── APPLICATION ── SUBMISSION (JSONB answers, form_version_id)
 │     │     ├── APPLICATION_STATUS_HISTORY
 │     │     ├── INTERVIEW
 │     │     └── AI_RESULT
 │     ├── DOCUMENT
 │     ├── NOTE
 │     ├── MESSAGE
 │     └── MERGE_REVIEW
 ├── TAG, STATUS_REASON_CODE, SAVED_VIEW
 └── AUDIT_LOG (append-only)
```

Rules: every table has `tenant_id uuid not null` and an RLS policy; `audit_log` has no UPDATE or DELETE grants; candidate and application are separate; submissions keep raw JSONB plus typed copies of screening answers; status history is the source for reports.

## 12. Integrations

| Integration | Trigger | Data | Error handling |
|---|---|---|---|
| WhatsApp (Meta Cloud API) | Workflow action, manual send | Approved template or free text inside the 24-hour window | Retry 1/5/30 min, then Failed and recruiter alert; outside the window only approved templates may be sent |
| Email (Postmark or SES) | Workflow action, reminders | Templated email | Same retry policy; bounces recorded on the message |
| Google Calendar | Interview booked | Event on interviewer calendar | Token refresh; on failure alert the interviewer |
| Microsoft 365 Calendar | Interview booked | Event on interviewer calendar | Same |
| Cloudflare Turnstile | Public form | Challenge token | Fail closed after 3 submits per IP |
| Inngest | Background work | Events | Built-in retries, dead-letter visible to admins |
| AI provider | AI-001, AI-002 | Stripped candidate data | Timeout or error routes the application to the human queue |

Messaging sits behind a `MessagingProvider` interface with a fake provider for tests. WhatsApp templates must be submitted to Meta for approval at the start of the workflow phase.

## 13. Security, Privacy and PDPA

| Area | Requirement |
|---|---|
| Authentication | Magic link plus Google and Microsoft sign-in |
| Authorisation | Role-based plus tenant and location scope from the session |
| Candidate data | Hosted in Singapore; access limited by role and location |
| Documents | Private bucket, 15-minute signed URLs |
| Logging | IDs only; never request bodies, names, phones, emails or CV text |
| Audit | Append-only record of: sign-ins, status changes, exports, document views, user and role changes, retention runs, deletion requests, AI settings changes |
| Exports | CSV columns limited by role; every export logged with user, filter and row count |
| API | Authenticated requests, signature-checked webhooks |
| Consent | Every form MUST contain a consent field stating purpose and retention; consent text and time stored with the submission |
| Data collection | No default field for NRIC/FIN, date of birth, race, religion, marital status or photo; builder warns on look-alike labels |
| Fair screening | Rules must not reference nationality, age, race, religion or gender; the rule builder warns |
| Access and correction | Candidate requests via signed status link; answered within 30 days |
| Deletion | Erasure removes personal fields and storage objects; aggregates stay; soft delete is not erasure |
| Retention | Per tenant and per status; default 12 months after last activity for Rejected, Withdrawn and unsuccessful candidates; Hired records follow the tenant's policy **[confirm]** |
| Breach | PDPC notification within 3 calendar days of assessing the breach as notifiable; runbook in `docs/RUNBOOK.md` |
| Vendors | Data processing agreement template for tenants; subprocessors listed |

## 14. Analytics

All time metrics report **median and 90th percentile**, not averages. All counts derive from `application_status_history`.

| Metric | Definition |
|---|---|
| Applications | Count of applications created in the range |
| Form completion rate | Submits ÷ starts |
| Screening rate | Applications that left New ÷ applications |
| Qualified % | Applications reaching Potential or Shortlisted ÷ applications |
| Interview conversion | Reached Interview ÷ reached Shortlisted |
| Offer conversion | Reached Offer ÷ reached Interview |
| Hire conversion | Reached Hired ÷ applications |
| Time to first contact | First outbound message or status change by a human or workflow minus application time |
| Time to screen | Time from New to first screened status |
| Time to hire | Application time to Hired |
| Show rate | Attended ÷ booked interviews |
| Applicants by source and by location | Counts, source taken from form, UTM or import |
| Workflow execution | Runs, success rate, Failed count |
| Automation rate | Applications moved by workflow ÷ all status moves |
| Recruiter time saved | Automated actions × configured minutes per manual equivalent **[confirm]** |
| Overdue items | Manager queue items past 24 hours, unmarked interviews past 12 hours |

Every dashboard tile and chart segment links to the candidate list with matching filters. Date range and location filters persist per user.

## 15. Acceptance Criteria

Each criterion becomes an automated test: pgTAP for database rules, Vitest for pure logic, Playwright for end-to-end.

| ID | Criterion | Test type |
|---|---|---|
| AC-01 | A form cannot be published without a name, a linked job, a contact field and a consent field. A published form gets a unique URL. | Vitest, Playwright |
| AC-02 | Submitting a published form stores answers with `form_version_id`, creates an application and copies screening-tagged answers to typed columns. Missing required answers block submission. | Playwright, pgTAP |
| AC-03 | A draft or unpublished form is not publicly reachable. Uploads outside the allowed type or size are rejected. The fourth submission from one IP in an hour requires Turnstile. | Playwright |
| AC-04 | A second submission with the same phone (in any common format, such as `91234567` and `+65 9123 4567`) or the same email attaches to the existing candidate. Name-only similarity creates a merge-review row, not a merge. | pgTAP, Vitest |
| AC-05 | A rule whose conditions match applies its actions: status changes, a message is queued, a task is created. A rule whose conditions do not match does nothing. | Vitest |
| AC-06 | When two rules conflict, the higher priority wins, `stop_further` halts lower rules, the conflict is logged, and a cascade stops at depth 5. | Vitest |
| AC-07 | A failing external action retries at 1, 5 and 30 minutes, then is marked Failed, the recruiter is alerted, and the status change stays in place. | Vitest with fake provider |
| AC-08 | Replaying the same event never sends a second message (idempotency key). | Vitest, pgTAP |
| AC-09 | Two concurrent bookings for the last slot: exactly one succeeds, the other gets a clear error. | pgTAP, Playwright |
| AC-10 | Every status change writes one history row and one audit row in one transaction. Rejected and Withdrawn without a reason code fail. | pgTAP |
| AC-11 | With AI enabled, a Weak result never sets Rejected unless `ai_auto_reject` is on. Low-confidence results go to the human queue. Names, photos and nationality never appear in the AI payload. | Vitest |
| AC-12 | A CSV export contains only the columns the role allows and writes an audit row with user, filter and row count. | Vitest, pgTAP |
| AC-13 | The nightly retention job anonymises candidates past their policy, deletes their storage objects, and reports counts. Aggregates are unchanged. | pgTAP, Vitest |
| AC-14 | A deletion or access request through the signed link is recorded, tracked against a 30-day deadline, and on approval removes personal fields and files. | Playwright, pgTAP |
| AC-15 | A manager queue item gets a reminder at 24 hours and an escalation at 48 hours. The one-tap link approves or declines once and then expires. | Vitest |

**Isolation tests (from section 3, no AC number):** a user in tenant A cannot read tenant B rows; a hiring manager scoped to location 1 cannot read location 2; nobody can update or delete `audit_log`. These live in `supabase/tests` and run on every CI build.

## 16. Delivery, Non-functional and Launch Requirements

**Build order:** 0 Scaffold, 1 Tenancy and access, 2 Candidate database, 3 Dashboard, 4 Forms, 5 Workflows and messaging, 6 Interviews, 7 Launch hardening, 8 AI screening.

**Non-functional**

| Area | Target |
|---|---|
| Candidate list | Under 2 seconds at 50,000 candidates |
| Dashboard | Under 3 seconds at 50,000 candidates |
| Public form | Usable on 375px phones; first load under 3 seconds on 4G |
| Availability | 99.5% monthly **[confirm]** |
| Backups | Daily, restore tested before launch |
| Region | Supabase ap-southeast-1, Vercel sin1 |
| Accessibility | Keyboard usable, WCAG 2.1 AA contrast on candidate-facing screens |

**Launch gates**

1. All of AC-01 to AC-15 pass in CI.
2. Isolation tests pass.
3. No logging of request bodies or personal data (code and log config reviewed).
4. External penetration test booked.
5. DPA template ready for the pilot client.
6. `docs/RUNBOOK.md` covers breach response, restore from backup, key rotation, and switching AI off per tenant.
7. WhatsApp templates approved by Meta.

## 17. Open Questions

1. Default retention period for unsuccessful candidates (draft: 12 months).
2. Whether tenants may add custom statuses beyond the nine defaults.
3. Whether hiring managers may see candidates before Shortlisted.
4. Whether Offer and Hired need any data capture (offer date, salary) in v1.
5. Pilot client's existing form fields, so the first import and form match real data.
6. Messaging provider choice: Postmark or SES; WhatsApp business number ownership per tenant.
7. Availability target and support hours.
