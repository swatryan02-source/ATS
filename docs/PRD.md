1. Executive Summary
Product name
Product purpose
Business problem
Proposed solution
Target users
Product scope

2. Product Objectives
Objective	Requirement	Success Metric
Reduce manual recruitment work	Automate form → screening → workflow	% reduction in manual processing
Improve candidate experience	Simple application flow	Completion rate
Improve recruiter efficiency	Centralised candidate workflow	Time saved per candidate

3. User Roles

Candidate
→ Application
→ Information submission
→ Screening
→ Status updates

Recruiter / TA
→ Create recruitment form
→ Configure workflow
→ Review candidates
→ Trigger actions

Hiring Manager
→ Review shortlisted candidates
→ Provide decision
→ View candidate information

Administrator
→ Manage users
→ Manage permissions
→ Configure system settings
→ View audit logs

4. End-to-End Product Workflow
CREATE RECRUITMENT FORM
          ↓
CONFIGURE QUESTIONS
          ↓
CONFIGURE SCREENING RULES
          ↓
PUBLISH FORM
          ↓
CANDIDATE APPLIES
          ↓
SYSTEM VALIDATES DATA
          ↓
AUTOMATED SCREENING
          ↓
┌─────────┴─────────┐
│                   │
QUALIFIED        NOT QUALIFIED
│                   │
↓                   ↓
SHORTLIST        REJECTION /
                 ALTERNATIVE FLOW
│
↓
HIRING MANAGER
REVIEW
│
↓
INTERVIEW
│
↓
OFFER
│
↓
ONBOARDING

5. Functional Requirements

Every feature will be written in a developer-friendly format:

FR-001 — Create Recruitment Form

Description:
Recruiters must be able to create a recruitment form without requiring technical knowledge.

User: Recruiter

Requirements:

User clicks Create Form.
System requests form name.
User selects job/position.
User adds questions.
User selects question type.
User can mark questions as required.
User can reorder questions.
User can preview the form.
User can save as draft.
User can publish the form.

Acceptance Criteria:

Form cannot be published without required fields.
Required questions must be completed before submission.
Published forms must generate a unique application URL.
Draft forms must not be publicly accessible.
Changes must be saved without losing existing questions.

6. Automated Workflow Engine

This will be one of the most important sections.

For example:

IF
Candidate = Singapore Citizen
AND
Willing to Work Weekends = YES
AND
Minimum Experience >= X

THEN
    Candidate Status = "Potential"
    Notify Recruiter
    Send WhatsApp Message
    Create Interview Task

The PRD will define:

Conditions
AND / OR logic
Multiple conditions
Actions
Trigger events
Workflow priority
Workflow conflicts
Failure handling
Manual override
Audit trail

7. Candidate Management

The system should define:

Function	Requirement
Candidate profile	Central candidate record
Application history	Track every application
Status	Applied → Screening → Interview → Offer → Hired
Documents	CV / supporting documents
Notes	Recruiter notes
Screening	Automated + manual
Communication	Message history
Audit trail	Record system actions

8. AI Requirements

If your demonstrated product uses AI, I'll specify it separately from normal automation.

Example:

AI-001 — CV Screening

The system shall:

Receive candidate CV.
Extract structured candidate data.
Compare candidate information against job requirements.
Generate a screening result.
Provide supporting reasons.
Flag uncertain results for human review.

Important: AI recommendations should not automatically make irreversible hiring decisions unless explicitly configured.

9. UI/UX Requirements

I'll document each screen individually:

Dashboard
│
├── Recruitment Forms
│   ├── Form List
│   ├── Create Form
│   ├── Edit Form
│   └── Form Analytics
│
├── Candidates
│   ├── Candidate List
│   ├── Candidate Profile
│   └── Candidate Timeline
│
├── Workflows
│   ├── Workflow Builder
│   └── Workflow History
│
└── Settings
    ├── Users
    ├── Permissions
    └── Integrations

Each screen will include:

Purpose
Components
Buttons
Fields
Validation
Empty states
Error states
Loading states
Mobile behaviour
Permissions
Expected system behaviour

10. API / Backend Requirements

I'll also translate the product into technical requirements such as:

POST   /forms
GET    /forms
GET    /forms/{id}
PUT    /forms/{id}
DELETE /forms/{id}

POST   /applications
GET    /applications
GET    /applications/{id}

POST   /workflows
PUT    /workflows/{id}
POST   /workflows/{id}/execute

POST   /candidates/{id}/screen
GET    /candidates/{id}/timeline

Along with:

Authentication
Authorisation
Database entities
API validation
Webhooks
Background jobs
Retry logic
Logging
Rate limiting
Error handling

11. Data Model

For example:

USER
 │
 ├── ROLE
 │
 └── ORGANISATION

JOB
 │
 ├── FORM
 │     ├── QUESTIONS
 │     └── WORKFLOWS
 │
 └── APPLICATION
        │
        └── CANDIDATE
              ├── DOCUMENTS
              ├── SCREENING
              ├── INTERVIEWS
              ├── COMMUNICATIONS
              └── STATUS HISTORY

12. Integrations

Depending on what is shown in your video, I'll specify integrations such as:

ATS
WhatsApp
Email
Job portals
Google/Microsoft
Calendar
AI services
Document storage
HR systems
Webhooks

Each integration will have:

Trigger → API → Data → Response → Error handling

13. Security & Permissions

I'll include:

Area	Requirement
Authentication	Secure login
RBAC	Role-based access
Candidate data	Access controlled
Documents	Secure storage
Audit	Track sensitive actions
API	Authenticated requests
Data deletion	Defined retention/deletion process
Privacy	Appropriate consent and data handling

14. Analytics

The PRD will define measurable metrics such as:

Applications
Completion rate
Screening rate
Qualified %
Interview conversion
Offer conversion
Hire conversion
Time-to-screen
Time-to-hire
Workflow execution
Automation success rate
Recruiter time saved
