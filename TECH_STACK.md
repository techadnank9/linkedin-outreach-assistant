# AI Outreach Assistant - Technical Stack and Architecture

## 1. Architecture Summary
- Web application hosted on Vercel
- Async workers hosted on Render
- Supabase used for database, auth, and storage
- Apify used for LinkedIn profile scraping
- Gemini used for profile extraction normalization and email generation

## 2. Technology Stack

### 2.1 Frontend
- `Next.js` (App Router)
- `TypeScript`
- `Tailwind CSS`

### 2.2 Backend and Services
- Next.js API routes for synchronous API endpoints
- Render worker service for async long-running jobs
- Webhook receivers for Apify run completion events

### 2.3 Data, Auth, and Storage
- Supabase Postgres for relational data
- Supabase Auth for user authentication/session handling
- Supabase Storage for optional artifacts/log snapshots

### 2.4 Scraping and Enrichment
- Apify actor integration for LinkedIn profile retrieval
- Extraction pipeline:
  1. Trigger actor run with profile URL
  2. Poll or receive webhook callback
  3. Normalize payload for Gemini extraction

### 2.5 AI Layer
- Gemini for:
  - Candidate and target structured extraction normalization
  - Personalized email generation
  - 3 tone-based variants from a single narrative strategy
- Prompt pipeline enforces:
  - no fabricated claims
  - tone and length constraints
  - profile-grounded personalization

## 3. Core Data Model (MVP)
- `users`
- `candidate_profiles`
- `target_profiles`
- `draft_sessions`
- `email_variants`
- `outcome_events`
- `job_runs` (Apify and generation job tracking)

## 4. End-to-End System Flow

### 4.1 Onboarding Flow
1. User submits personal LinkedIn URL once.
2. API creates extraction job and dispatches Apify run.
3. Worker receives run result, sends raw profile text/signals to Gemini.
4. Gemini returns structured `CandidateProfile` fields.
5. User reviews and edits extracted fields.
6. Profile persists in Supabase and becomes default for future sessions.

### 4.2 Outreach Generation Flow
1. User submits hiring manager/founder LinkedIn URL.
2. API dispatches target extraction job via Apify.
3. Worker normalizes target profile with Gemini.
4. User confirms/edits target profile.
5. API calls Gemini generation pipeline with:
   - stored candidate profile
   - target profile
   - variant constraints (3 tones)
6. System stores `DraftSession` + `EmailVariant` rows.
7. UI renders selectable variants and copy actions.

### 4.3 Outcome Logging
1. User marks status (`sent`, `replied`, `interview`).
2. API stores `OutcomeEvent` and links to draft session.
3. Analytics pipelines compute reply-rate trends.

## 5. Deployment Topology

### 5.1 Vercel Responsibilities
- Host Next.js frontend
- Serve API routes for user-triggered actions
- Handle auth-gated page rendering

### 5.2 Render Responsibilities
- Run background worker for:
  - Apify dispatch/poll/webhook processing
  - Gemini extraction/generation jobs
  - retries and dead-letter handling

### 5.3 Supabase Integration Points
- Auth session management in frontend/backend
- Persistent profile and draft data in Postgres
- Storage buckets for optional processing artifacts

### 5.4 Apify Job Reliability
- Use idempotent job keys per URL + session
- Retry transient failures with backoff
- Webhook verification + duplicate callback protection
- Timeout and fallback error states exposed to UI

## 6. API Surface (MVP)
- `POST /v1/profiles/extract`
- `POST /v1/profile/refresh`
- `POST /v1/emails/generate`
- `POST /v1/outcomes`

## 7. Security and Compliance Baseline
- TLS in transit, encrypted data at rest
- Row-level security strategy in Supabase
- Access controls: users can only read/write their own profile and drafts
- Secrets managed via Vercel/Render environment variables
- PII minimization and user-controlled deletion

## 8. Observability and Operations
- Error monitoring: Sentry (frontend + backend + workers)
- Product analytics: event tracking for funnel and KPI measurements
- Structured logs with correlation IDs across API + worker jobs
- Dashboards for:
  - extraction success rate
  - generation latency
  - variant selection distribution
  - outcome conversion events

## 9. Rate Limits and Abuse Controls
- Per-user and per-IP rate limits on extraction/generation endpoints
- Daily generation quotas for MVP cost protection
- Input validation and URL sanitization prior to job dispatch

## 10. Cost Controls
- Cache extraction results when URLs repeat within a TTL window
- Cap generation token budget per request
- Enforce max retries for Apify and Gemini calls
- Track per-user cost metrics for future pricing and guardrails

## 11. Mobile and Tablet Support Considerations
- API responses optimized for low-bandwidth conditions
- Incremental rendering of extraction and generation states
- Keep payloads compact for mobile performance
- Preserve session and draft state across orientation changes

## 12. Assumptions
- MVP is draft-only and does not send emails.
- Apify actor output quality is sufficient for normalization.
- Gemini is the sole model provider in MVP.
- Dribbble shot guides layout style, not direct implementation parity.
