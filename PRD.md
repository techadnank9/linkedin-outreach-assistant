# AI Outreach Assistant for Job Seekers - Product Requirements Document

## 1. Product Overview

### 1.1 Objective
Build an AI-powered outreach assistant that helps job seekers create high-quality personalized outreach emails to hiring managers and founders using LinkedIn profile context.

### 1.2 Primary Persona
- Job seeker (individual user)

### 1.3 Primary KPI
- Reply-rate uplift compared to user baseline outreach performance

## 2. MVP Scope

### 2.1 In Scope
- One-time user LinkedIn onboarding
- Automated profile extraction and editable profile form
- Persistent user profile reuse across sessions
- Target profile extraction from hiring manager/founder LinkedIn URL
- Personalized email generation using both user and target profiles
- Exactly 3 email variants per request (same core message, different tones)
- Draft-only output (user copies and sends manually)
- Outcome logging for analytics (`sent`, `replied`, `interview`)

### 2.2 Out of Scope
- Automated send
- CRM integrations
- Team collaboration
- Multi-channel outreach (LinkedIn DM/SMS)

## 3. Finalized User Flow
1. User enters their own LinkedIn URL once during onboarding.
2. Gemini extracts profile details and auto-fills an editable user profile form.
3. User saves profile; profile is persisted and reused (no re-entering user URL).
4. For each outreach attempt, user enters hiring manager/founder LinkedIn URL.
5. Gemini extracts target profile into an editable form.
6. System generates 3 email variants using the same core narrative with different tones.
7. User chooses, edits if needed, copies, and sends manually.
8. User logs outcome when available.

## 4. UX and Design Requirements

### 4.1 Design Direction
- Composition-first workflow inspired by inbox-style compose experiences
- Reference style inspired by Dribbble shot: create-email inbox composition
- Split workspace on larger screens: context + compose output visible together

### 4.2 Core UX Requirements
- Context panel for extracted profile signals (user + target)
- In-compose variant switching for the 3 generated emails
- Fast “Use this variant” and “Copy” actions
- Editable extraction results before generation

## 5. Responsive Requirements (Mobile + Tablet + Desktop)

### 5.1 Mobile (<= 767px)
- Step-based single-column flow:
  - Step 1: Saved profile review
  - Step 2: Target URL + extraction review
  - Step 3: Variant selection and copy
- Sticky bottom action bar for primary actions (`Generate`, `Use Variant`, `Copy`)
- Touch targets >= 44px
- No horizontal scrolling in core flows

### 5.2 Tablet (768px - 1023px)
- Adaptive two-pane layout
- Left pane: forms/context
- Right pane: generated email variants and preview
- Collapsible panes for focus mode

### 5.3 Desktop (>= 1024px)
- Full composition-first split workspace
- Inbox-like layout with persistent context panel and compose area
- 3 variants visible through tabs/cards without navigation away from compose screen

## 6. Functional Requirements
- FR1: Accept user LinkedIn URL once in onboarding.
- FR2: Extract user profile with Gemini into structured editable fields.
- FR3: Persist user profile and auto-load in future sessions.
- FR4: Do not require re-entry of user LinkedIn URL after onboarding.
- FR5: Provide manual `Refresh Profile` action to re-extract latest profile.
- FR6: Accept hiring manager/founder LinkedIn URL per outreach request.
- FR7: Extract target profile with Gemini into editable fields.
- FR8: Generate exactly 3 personalized email variants.
- FR9: Keep core message strategy consistent across variants while changing tone.
- FR10: Provide one-click copy action per variant.
- FR11: Store draft session metadata and selected variant.
- FR12: Capture user-reported outcomes for KPI tracking.

## 7. Non-Functional Requirements
- NFR1: Generation latency target <= 20s p95 for extract + draft flow.
- NFR2: Service availability target >= 99.5% monthly.
- NFR3: Encryption in transit and at rest for user data.
- NFR4: Explicit user consent for profile processing.
- NFR5: Data deletion controls for user profile and draft history.
- NFR6: Basic rate limiting and abuse protection on generation endpoints.

## 8. Public Interfaces and Data Types

### 8.1 API Contracts
- `POST /v1/profiles/extract`
  - Input: `url`, `profileType` (`candidate` or `target`)
  - Output: structured extracted profile + confidence metadata
- `POST /v1/emails/generate`
  - Input: `candidateProfileId`, `targetProfile`, generation preferences
  - Output: 3 email variants + subjects
- `POST /v1/profile/refresh`
  - Input: none (uses authenticated user profile source)
  - Output: updated extracted profile draft for review
- `POST /v1/outcomes`
  - Input: `draftSessionId`, `status`, optional notes
  - Output: saved outcome event

### 8.2 Core Types
- `CandidateProfile`
- `TargetProfile`
- `EmailVariant`
- `DraftSession`
- `OutcomeEvent`

## 9. Testing and Acceptance Scenarios

### 9.1 Functional Scenarios
- Onboarding extraction success and failure handling
- Returning user bypasses self-URL input
- Manual profile refresh updates persisted profile
- Target profile extraction fallback path when fields are missing
- Three variants always generated and tone-distinct

### 9.2 Responsive Scenarios
- Mobile end-to-end flow with no layout breakage
- Tablet two-pane usability and action accessibility
- Desktop split workspace with variant switching inside compose view

### 9.3 KPI Scenarios
- Outcome events are captured and queryable
- Reply-rate uplift calculation supports user baseline comparison

### 9.4 Acceptance Criteria
- User provides own LinkedIn URL only once in onboarding.
- Saved profile is reused automatically in future draft sessions.
- Each generation produces exactly 3 variants from same strategy, different tones.
- Mobile/tablet/desktop flows all support completion without horizontal scrolling.
- Draft copy action works in <= 2 taps/clicks from variant selection.

## 10. Risks and Mitigations
- Risk: Profile extraction inaccuracies
  - Mitigation: editable extracted forms with explicit user confirmation
- Risk: Inconsistent personalization quality
  - Mitigation: structured extraction schema + prompt constraints + regeneration
- Risk: Small-screen usability degradation
  - Mitigation: breakpoint-specific interaction patterns and touch-first controls

## 11. Assumptions and Defaults
- Repo is documentation-first and MVP-focused.
- User LinkedIn is captured once and refreshable manually.
- Sending remains outside the product (draft-only MVP).
- Dribbble reference informs layout style, not direct replication.
