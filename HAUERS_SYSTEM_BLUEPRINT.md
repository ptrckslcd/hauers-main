# HAUERS — Adaptive CSE-PPT Review Platform
## Complete System Blueprint for Title Defense
### CSPC ACCESS · Team Hauers

> **Document Purpose:** This is the authoritative specification document for the HAUERS system. It defines the complete system architecture, user flows, module-by-module content breakdown, sidebar navigation, and database schema. It is intended to be used as the primary context for AI coding agents and as the structural guide for all remaining development work.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Critical Issues in the Current Codebase](#2-critical-issues-in-the-current-codebase)
3. [Roles, Exam Levels, and Domains](#3-roles-exam-levels-and-domains)
4. [Complete System User Flow](#4-complete-system-user-flow)
5. [Authentication and Enrollment Flow](#5-authentication-and-enrollment-flow)
6. [Final Sidebar Navigation Structure](#6-final-sidebar-navigation-structure)
7. [Reviewee Dashboard — Module-by-Module Breakdown](#7-reviewee-dashboard--module-by-module-breakdown)
8. [Admin (ACCESS Staff) Dashboard — Module-by-Module Breakdown](#8-admin-access-staff-dashboard--module-by-module-breakdown)
9. [Foundational Database Schema](#9-foundational-database-schema)
10. [M-Elo Engine Service — Implementation Specification](#10-m-elo-engine-service--implementation-specification)
11. [Rule-Based Content Recommender — Implementation Specification](#11-rule-based-content-recommender--implementation-specification)
12. [Access Control and Middleware Rules](#12-access-control-and-middleware-rules)
13. [API Route Map](#13-api-route-map)
14. [Title Defense Build Priority](#14-title-defense-build-priority)

---

## 1. System Overview

**System Name:** HAUERS (Adaptive CSE-PPT Review Platform with Learner Profiling and Domain Competency Analytics)

**Client:** CSPC ACCESS (Academic Center for Continuing Enhancement Services for Students)

**Institution:** Camarines Sur Polytechnic Colleges

**Purpose:** A web-based adaptive review platform for CSE-PPT (Civil Service Examination – Pen and Paper Test) preparation. The system uses the Multi-Concept Multivariate Elo (M-Elo) algorithm to track per-domain learner competency in real time, delivers adaptive practice sessions through a Rule-Based Content Recommender, and surfaces cohort-level analytics to ACCESS administrators.

**Core Modules (per Chapter 3):**
1. Learner Profiling Module
2. Diagnostic Assessment Module
3. Adaptive Content Engine Module (M-Elo Engine + Rule-Based Content Recommender)
4. Interactive Analytics Dashboard Module

**Tech Stack (per Chapter 3):**
- Runtime: Node.js 24.x LTS
- Framework: Express.js 5.x
- Template Engine: EJS 5.x
- CSS: Tailwind CSS 4.x
- Database: MySQL 8.4 LTS
- ORM: Prisma 7.x
- Auth: Passport.js (local + Google OAuth 2.0)
- Password Hashing: Bcrypt
- Charts: Chart.js 4.x
- Containerization: Docker

> **Note on current state:** The current codebase uses vanilla CSS (not Tailwind) and does not yet use Prisma. For the title defense, the UI foundation (custom CSS) is acceptable as a working prototype. The priority is making the flow correct, the database schema sound, and the core adaptive logic present. Tailwind migration can happen after.

---

## 2. Critical Issues in the Current Codebase

The following issues must be understood before any further development. Some must be fixed before the title defense; others are noted as technical debt.

### 2.1 Database Schema is Critically Incomplete

The current `schema.sql` only has 5 tables: `users`, `questions`, `progress_metrics`, `study_plans`, `materials`. This is insufficient for the system's actual requirements. Missing entirely:

- No `batches` or `cohorts` table (needed for the enrollment code system)
- No `enrollment_codes` table
- No `enrollments` table (linking users to batches)
- No `domains` table (Professional has 5 domains, Sub-Professional has 3)
- No `question_domains` join table (multi-domain tagging for M-Elo)
- No `learner_profiles` table (the Learner Profiling Module data)
- No `diagnostic_sessions` table (diagnostic attempt records)
- No `diagnostic_answers` table (per-item responses during diagnostic)
- No `practice_sessions` table (adaptive practice attempt records)
- No `session_answers` table (per-item responses during practice)
- No `domain_ratings` table (the live M-Elo theta ratings per user per domain)
- No `announcements` table
- No `post_tests` table (for post-test management by admin)
- The `progress_metrics` table stores JSON blobs which makes analytics impossible
- The `study_plans` table stores JSON blobs which makes dynamic adjustment impossible

### 2.2 Mock Data Must Be Removed

The following mock data files are being served as real system data. These must be replaced by real database queries:
- `data/mock-study-plan.js`
- `data/mock-progress.js`
- `data/mock-review-materials.js`
- `data/mock-admin-dashboard.js`
- `data/mock-diagnostic-results.js`
- `data/mock-reviewee-dashboard.js`

### 2.3 Enrollment Code System is Missing Entirely

Chapter 3 (and the product brief) specifies that after registration, a user must enter an enrollment code issued by ACCESS to enroll in a specific batch and exam level. No part of this flow exists in the current codebase. The current onboarding just asks for exam level with no verification.

### 2.4 Exam Level Domains are Incomplete

The current system only models 3 domains (Verbal, Numerical, Clerical). This is only correct for Sub-Professional level. Professional level has 5 domains:
- Verbal Ability
- Numerical Ability
- Clerical Ability
- General Information
- Analytical Ability

All question bank entries, M-Elo rating records, and diagnostic question sets must be domain-level aware per exam level.

### 2.5 M-Elo Engine Does Not Exist

The current diagnostic and quiz logic is a simple score counter with mock results. The M-Elo algorithm — which computes per-domain rating updates after each answer and persists them — is not implemented. This is the algorithmic core of the system.

### 2.6 Passwords Are Stored in Plaintext

The seed data in `schema.sql` inserts `password: '123456'` directly. For the title defense, bcrypt hashing must be used at signup. The demo seed users should have properly hashed passwords.

### 2.7 Signup Does Not Actually Create Accounts

The route `POST /auth/signup` has a TODO comment and does a "mock insertion." This must be implemented as a real user registration with bcrypt hashing and email verification flow.

### 2.8 The Profile Form Page (Admin) Has No Backend

The `profile-form.ejs` admin view renders a Google-Forms-like form editor but has no database-backed save or response collection. This is a UI-only page.

### 2.9 The Analytics Page Uses Hardcoded Pass Rate

In `routes/admin.js`: `passRate: 34, // Mocked complex analytic`. The admin analytics dashboard must compute real cohort data from the database.

### 2.10 Inconsistency: `analytics.ejs` vs `reports` vs `dashboard`

The admin sidebar references "Reports" but there is also a separate `analytics.ejs` view. These need to be unified under one section.

---

## 3. Roles, Exam Levels, and Domains

### 3.1 User Roles

| Role | Description | Access |
|---|---|---|
| `reviewee` | CSE-PPT reviewer (student or faculty of CSPC) | Reviewee dashboard only |
| `admin` | ACCESS Staff/Administrator | Admin dashboard only |

> There is only one admin role. The earlier iterations that had separate Faculty/Admin roles have been consolidated into a single ACCESS Staff role per the team's documented decision.

### 3.2 Exam Levels

| Level | Code | Domains |
|---|---|---|
| Sub-Professional | `subprofessional` | Verbal Ability, Numerical Ability, Clerical Ability |
| Professional | `professional` | Verbal Ability, Numerical Ability, Clerical Ability, General Information, Analytical Ability |

> The exam level is bound to the reviewee at the enrollment code stage. The enrollment code encodes both the batch and the exam level. A reviewee cannot change their exam level after enrollment without admin action.

### 3.3 Domain Codes

| Domain Name | Code | Levels |
|---|---|---|
| Verbal Ability | `verbal` | Both |
| Numerical Ability | `numerical` | Both |
| Clerical Ability | `clerical` | Both |
| General Information | `general_info` | Professional only |
| Analytical Ability | `analytical` | Professional only |

---

## 4. Complete System User Flow

### 4.1 Top-Level Flow Diagram

[Public Landing Page]
         │
         ├─► [Login]
         │        └─► [Role-based redirect]
         │                 ├─► Admin Dashboard
         │                 └─► Reviewee Dashboard (if onboarded) OR Onboarding (if new)
         │
         └─► [Sign Up]
                  └─► Email OTP Verification
                           └─► Onboarding: Profile setup + Optional Enrollment Code
                                    ├─► Option A: Complete Profile + Enroll → Diagnostic → Dashboard
                                    └─► Option B: Complete Profile only → Dashboard (limited access)
```

### 4.2 Detailed Reviewee Journey

**Step 1 — Public Registration**
- User visits `/signup`
- Fills: First name, Last name, Email, Password, Confirm Password
- System creates an unverified account (`is_verified = false`, `is_enrolled = false`)
- System sends OTP to email
- Redirect to `/signup-success` (OTP entry screen)

**Step 2 — Email Verification**
- User enters the 6-digit OTP
- On success: account set to `is_verified = true`
- Redirect to `/reviewee/onboarding`

**Step 3 — Onboarding: Profile Setup & Enrollment**
- User fills the Learner Profile Form:
  - Personal Information (Name, Birthdate, Sex)
  - Target exam level selection (if not enrolling via code)
  - Optional: ACCESS Enrollment Code (ties account to a batch)
  - Domain self-ratings and study preferences
- On save:
  - Account marked as `is_onboarded = true`
  - If code provided: account set to `is_enrolled = true`
  - Redirect to Step 4 (if enrolled) OR Dashboard (if skipped enrollment)

**Step 4 — Diagnostic Assessment (Prerequisite for Practice)**
- System shows a gate: "You must enroll and complete the Diagnostic Assessment to unlock full platform features."
- If enrolled: User starts the diagnostic assessment.
- Domain-mapped questions served based on exam level
- Elevated K-factor applied (K = 48 vs standard K = 24)
- After each answer, M-Elo updates theta per tagged domain
- Timer runs for entire session
- On completion:
  - All domain ratings updated from baseline 1200 to calibrated values
  - `diagnostic_sessions` record finalized
  - Study plan auto-generated from diagnostic ratings (weak domains get more sessions)
  - Redirect to `/reviewee/diagnostic-result`

**Step 6 — Diagnostic Results + Study Plan Reveal**
- User sees their per-domain competency scores
- System displays the generated Study Plan
- Redirect CTA: "Start Studying"
- All sections of the dashboard are now unlocked

**Step 7 — Regular Platform Usage (ongoing)**
- User logs in → lands on Dashboard
- Follows Study Plan or freely starts a Practice Session
- Practice Session: M-Elo updates after every answer
- Views Progress analytics
- Reads review materials
- Checks announcements

### 4.3 Admin Journey

**Step 1 — Admin Login**
- Admin visits `/login`
- Uses ACCESS-managed admin credentials
- Redirect to `/admin/home`

**Step 2 — Batch and Enrollment Management**
- Admin creates a new batch (e.g., "Batch 2026 — Professional")
- System generates enrollment codes for that batch
- Admin distributes codes to reviewees (e.g., via announcement or in-person)

**Step 3 — Content Management**
- Admin adds questions to the Question Bank (tagged with domains and exam level)
- Admin uploads/manages learning materials
- Admin publishes announcements

**Step 4 — Monitoring**
- Admin views the Reviewees list (see who enrolled, who completed diagnostic, who is active)
- Admin views Cohort Analytics (aggregate domain weakness data, no individual exposure)
- Admin manages the Learner Profile Form (add/remove questions for future reviewees)

---

## 5. Authentication and Enrollment Flow

### 5.1 Registration (`POST /auth/signup`)

```
Input: first_name, last_name, email, password, confirm_password
Validate:
  - All fields present
  - Email is unique in users table
  - Password and confirm_password match
  - Password minimum length (8 chars)
Process:
  - Hash password with bcrypt (saltRounds = 10)
  - Insert into users: { first_name, last_name, email, password_hash, role='reviewee', is_verified=false, is_enrolled=false }
  - Generate 6-digit numeric OTP
  - Store OTP in email_verifications table with expiry (15 minutes)
  - Send OTP email (or mock it for title defense)
  - Store email in session
Response: redirect to /signup-success
```

### 5.2 OTP Verification (`POST /auth/verify-otp`)

```
Input: otp (from session: email)
Validate:
  - OTP matches record in email_verifications table
  - OTP is not expired
Process:
  - Set users.is_verified = true
  - Delete OTP record
  - Set session.userId
  - Set session.role = 'reviewee'
Response: redirect to /reviewee/onboarding
```

### 5.3 Enrollment Code (`POST /reviewee/api/enroll`)

```
Input: enrollment_code (string)
Auth: requireAuth (must be a logged-in, verified reviewee who is not yet enrolled)
Validate:
  - Code exists in enrollment_codes table
  - Code's batch is active (not expired, not closed)
  - Code has not been used by another user (or is not at capacity)
  - Current user is not already enrolled in this batch
Process:
  - Create enrollments record: { user_id, batch_id, enrolled_at }
  - Set users.exam_level from batch.exam_level
  - Set users.batch_id = batch.id
  - Set users.is_enrolled = true
  - Mark enrollment_code as used (or decrement remaining_uses)
  - Initialize domain_ratings records for this user:
    - One row per domain in the exam level
    - theta = 1200, k_factor = 48, sessions_count = 0
Response: { success: true, examLevel, batchName } → client redirects to learner profile step
```

Any reviewee who is `is_verified = true` but `is_onboarded = false` must be redirected to the onboarding flow when they attempt to access any reviewee page.

Any reviewee who is onboarded but `is_enrolled = false` is allowed to access the Dashboard but will see prompts to enroll. They are blocked from Diagnostic, Practice, and Analytics until enrolled.

Any reviewee who is enrolled but has no completed diagnostic must be redirected to the diagnostic gate when accessing Review, Progress, Study Plan, or Materials pages.

---

## 6. Final Sidebar Navigation Structure

### 6.1 Reviewee Sidebar

```
NAVIGATION
──────────
🏠  Home                   /reviewee/dashboard
📝  Review                 /reviewee/review
    └── (leads to Practice Session or Study Plan view)
📊  My Progress            /reviewee/progress
📅  Study Plan             /reviewee/study-plan
📚  Learning Materials     /reviewee/materials
📣  Announcements          /reviewee/announcements

ACCOUNT
───────
👤  My Profile             /reviewee/profile
⚙️  Settings               /reviewee/settings

LEGAL
─────
🔒  Privacy Policy         /privacy
📄  Terms of Service       /terms
```

**Notes:**
- "Profile" in the sidebar and "Learner Profile" in the navbar dropdown point to the same page (`/reviewee/profile`). Remove the redundancy — keep one label consistently as "My Profile."
- "Study Plan" is a standalone page, not a sub-section of "Review." The review page leads to starting a practice session.
- Remove "Help & Support" from the sidebar (it exists in the navbar profile dropdown — one place is enough for a lean UI).

**Navbar Profile Dropdown (Reviewee):**
```
👤  My Profile
⚙️  Account Settings
─────
🚪  Logout
```

### 6.2 Admin Sidebar

```
OVERVIEW
────────
🏠  Home                   /admin/home

MANAGEMENT
──────────
👥  Reviewees              /admin/reviewees
🗂️  Batches & Enrollment   /admin/batches
❓  Question Bank          /admin/question-bank
📚  Learning Materials     /admin/materials
📝  Profile Form           /admin/profile-form
📣  Announcements          /admin/announcements

ANALYTICS
─────────
📊  Reports & Analytics    /admin/reports

SYSTEM
──────
⚙️  System Settings        /admin/settings
❓  Help & Support         /admin/help
```

**Notes:**
- "Analytics" and "Reports" are unified into one section: "Reports & Analytics" at `/admin/reports`. The separate `analytics.ejs` and the reports page are merged.
- "Batches & Enrollment" is a new section that covers batch creation, enrollment code generation, and enrollment management. This replaces the absence of this feature.

**Navbar Profile Dropdown (Admin):**
```
⚙️  Account Settings
─────
🚪  Logout
```

---

## 7. Reviewee Dashboard — Module-by-Module Breakdown

### 7.1 Home (`/reviewee/dashboard`)

**Purpose:** The reviewee's central command center. At a glance, shows where they are in their preparation journey, what they should do today, and how they are trending.

**Sections and Content:**

#### 7.1.1 Top Stats Row (4 cards)
| Card | Data | Source |
|---|---|---|
| Exam Readiness Score | Overall computed readiness percentage (0–100%) | Derived from average M-Elo theta across all domains, normalized to CSE passing benchmark (50%) |
| Study Streak | Consecutive days with at least one practice session | `users.streak` field, updated on session completion |
| Sessions Completed | Total practice sessions done | COUNT from `practice_sessions` |
| Days Until Exam | Calculated from `learner_profiles.target_exam_date` | DATE_DIFF from today |

> If the user has not yet completed the diagnostic, these cards show placeholder states with a CTA: "Complete your Diagnostic Assessment to see your stats."

#### 7.1.2 Domain Competency Overview (horizontal bar chart or card grid)
- One bar per domain (3 bars for Sub-Pro, 5 for Professional)
- Shows current M-Elo theta value normalized to a 0–100% readiness scale
- Color coded: Red (< 40%), Yellow (40–69%), Green (≥ 70%)
- Data from: `domain_ratings` table for the current user

#### 7.1.3 Today's Focus (Study Plan Tile)
- Shows what the study plan recommends for today (day of week + current week's tasks)
- One or two task items with domain label and estimated time
- "Start Practice" button → routes to `/reviewee/review` with the domain pre-selected

#### 7.1.4 Recommended Materials (small list, up to 3 items)
- Materials mapped to the user's weakest domain (lowest theta)
- Each item: title, domain badge, material type, estimated minutes
- "View All" link → `/reviewee/materials`

#### 7.1.5 Recent Activity (small list)
- Last 3 practice sessions: date, domains covered, score
- "View Full Progress" → `/reviewee/progress`

#### 7.1.6 Announcements Banner (conditional)
- If there are unread announcements from ACCESS, show the most recent one as a banner with a "View All" link

**Pre-diagnostic state:** When a reviewee has not yet completed the diagnostic, the dashboard shows a mandatory onboarding prompt card that blocks the stats content and directs the user to complete their profile → take the diagnostic.

---

### 7.2 Review (`/reviewee/review`)

**Purpose:** The main learning interface. This is where the adaptive practice sessions happen. This is the most algorithmically important page.

**Sub-pages:**
- `/reviewee/review` — Session launcher (domain filter + start button)
- `/reviewee/review/session` — Active practice session (question-by-question interface)
- `/reviewee/review/result` — Post-session result summary

**Sections:**

#### 7.2.1 Session Launcher (`/reviewee/review`)
- **Today's Recommendation Panel:** Shows the system-recommended session configuration (domains, approximate question count) based on Study Consistency Indicator and current M-Elo ratings. Includes: "Start Recommended Session" button (most prominent CTA).
- **Custom Session Panel:** Let the user optionally choose a specific domain to focus on, or "All Domains." Number of questions selector (10, 15, 20, 30).
- **Recent Sessions:** List of last 5 sessions with date, domain mix, score %, and duration.
- **Gate check:** If diagnostic is not completed, this page shows a locked state with a CTA to complete the diagnostic.

#### 7.2.2 Active Practice Session (`/reviewee/review/session`)
This is a full-screen, distraction-free test interface. Not the same layout as the main app shell — the sidebar should collapse or hide.

- **Session Header:** Domain badge(s), question counter ("Question 3 of 15"), session timer (optional, not a hard limit like the diagnostic)
- **Question Card:** Question text, 4 answer choices (A, B, C, D)
- **Answer submission:** User selects an answer → system immediately submits to API
- **Feedback after each answer:** Show if correct/incorrect, reveal the correct answer, show a brief explanation if available. This is not a deferred-reveal test — it is immediate feedback for learning.
- **Domain progress mini-bar:** Updates in real time after each answer to show the session's running domain score
- **Navigation:** Next button. Can go back to review previous answers (answered choices locked, but feedback visible).
- **Abandon session:** Confirmation dialog if user tries to leave mid-session. Partial sessions should still be saved.

**API behavior during session:**
- `POST /reviewee/api/session/answer` — Called on each answer submission
  - Body: `{ session_id, question_id, selected_choice, time_spent_ms }`
  - Server runs M-Elo update synchronously:
    - Looks up question's domain tags
    - Fetches user's current theta per tagged domain
    - Computes expected probability
    - Computes delta (actual outcome − expected)
    - Applies K-factor (K = 24 standard)
    - Updates theta per domain
    - Persists to `domain_ratings` and `session_answers`
  - Returns: `{ is_correct, correct_answer, explanation, updated_domain_ratings }`

#### 7.2.3 Session Result (`/reviewee/review/result`)
Shown after "Finish Session" or when all questions are answered.

- **Score Summary:** Total score (X/N correct, % score), time elapsed
- **Domain Breakdown Table:** Per domain — questions answered, correct, score %, theta change (↑ or ↓ with value)
- **Top Mistakes:** Up to 3 questions the user got wrong, shown with correct answer and explanation
- **Next Step Recommendation:** "Your weakest area is [Domain]. We recommend reviewing [Material]." CTA button: "View Materials" or "Start Another Session"
- Button: "Back to Review" → returns to session launcher
- Button: "View Full Progress" → goes to `/reviewee/progress`

---

### 7.3 My Progress (`/reviewee/progress`)

**Purpose:** The personal analytics dashboard. Visualizes learning trajectory over time. Maps to the Analytics Dashboard Module in Chapter 3.

**Sections:**

#### 7.3.1 Readiness Overview
- **Exam Readiness Indicator:** Large gauge or radial chart. Shows overall readiness % relative to the CSE passing benchmark. Displays conditional message: "You're on track" / "Needs improvement" / "Exam in X days — focus on [domain]."
- This indicator is especially prominent when the exam date is within 2 weeks.

#### 7.3.2 Domain Competency Trend (line chart per domain)
- One line per domain on a shared timeline chart
- X-axis: dates of practice sessions
- Y-axis: M-Elo theta rating (1000–1600 range, or normalized to %)
- Hover tooltip: date, session score, theta value
- Requires: at least 2 sessions to render (shows empty state with message if not enough data)
- Data from: aggregated `session_answers` + `domain_ratings` history

#### 7.3.3 Study Consistency Indicator
- Shows a computed score (e.g., 0–100 "consistency score") based on:
  - Frequency of sessions per week
  - Regularity (did they skip days?)
  - Score trend direction (improving, declining, plateaued)
- Visual: small icon + label ("Consistent", "Irregular", "Declining — take a break")
- Below the indicator: streak count and last active date

#### 7.3.4 Session History Table
- Sortable, paginated list of all practice sessions
- Columns: Date, Domains, Questions, Score %, Duration, Theta Change
- Click row → shows session detail (the result page for that historical session)

#### 7.3.5 Domain Deep-Dive Cards
- One card per domain
- Each card: current theta, total questions answered in that domain, correct %, best session score, sessions count
- Clicking a domain → filters the trend chart to that domain

---

### 7.4 Study Plan (`/reviewee/study-plan`)

**Purpose:** The system-generated personalized weekly study schedule. Adjusts automatically as M-Elo ratings change.

**How the study plan is generated:**
1. At diagnostic completion, the system reads the reviewee's domain ratings and exam date.
2. It calculates weeks remaining.
3. Weak domains (lowest theta) are assigned more sessions per week.
4. Strong domains are given maintenance sessions (1 per week).
5. Each day of the week is assigned a focus domain.
6. After each practice session, if the session causes an M-Elo update that changes domain priority, the plan adjusts in the next render.

**Sections:**

#### 7.4.1 Plan Overview Header
- Target Exam Date (editable via learner profile)
- Weeks Remaining
- Current Week number
- Weekly goal progress (e.g., "3 of 5 sessions completed this week")

#### 7.4.2 Weekly Schedule View
- 7-day grid showing this week's schedule
- Each day: domain label, estimated session duration, "Completed" badge if done
- Today's task is highlighted
- "Start Today's Session" button → launches practice session with that day's domain pre-set

#### 7.4.3 Phase Overview
- A high-level view of the whole preparation timeline, divided into phases:
  - Phase 1 (Early): Diagnostic baseline calibration, all domains surveyed
  - Phase 2 (Foundation): Concentrated weak-domain sessions
  - Phase 3 (Consolidation): Balanced sessions + review materials
  - Phase 4 (Pre-exam): Mixed sessions + exam readiness monitoring
- User sees which phase they are in now

#### 7.4.4 Plan Adjustment Log
- A small timeline of recent auto-adjustments: "2025-05-01: Numerical Ability moved to Priority after session decline."
- Helps the user understand why the plan changed.

---

### 7.5 Learning Materials (`/reviewee/materials`)

**Purpose:** A searchable, filterable library of review content. Materials are uploaded by ACCESS staff and tagged to domains.

**Sections:**

#### 7.5.1 Recommended for You (top section)
- Up to 5 materials recommended for the user's weakest domain(s)
- Each card: domain badge, material type (Lesson Module / Practice Set / Mock Exam), title, brief description, estimated read/completion time, difficulty badge
- "Start" button

#### 7.5.2 Browse All Materials
- Search bar (by title keyword)
- Domain filter (chips/tabs: All | Verbal | Numerical | Clerical | General Info | Analytical)
- Type filter: All | Lesson Module | Practice Set | Mock Exam | Reference Sheet
- Difficulty filter: All | Basic | Intermediate | Advanced
- Card grid: each card has domain badge, type, title, short description, difficulty, estimated time, "Start" or "Download" button

#### 7.5.3 Material Viewer (inline or modal)
- For text-based content: rendered inline
- For PDFs: embedded PDF viewer
- For external links: opens new tab

**Note:** Materials are admin-uploaded resources. The `materials` table stores title, domain, type, description, difficulty, estimated time, and file path or URL.

---

### 7.6 Announcements (`/reviewee/announcements`)

**Purpose:** Official communications from ACCESS to all reviewees (or batch-specific messages).

**Sections:**
- List of announcements sorted by date (newest first)
- Each item: title, date, category label (General / Schedule / Important), author (ACCESS Staff), body text
- Unread announcements are visually highlighted
- Clicking marks as read

**Admin can post:**
- A global announcement (all reviewees see it)
- A batch-specific announcement (only reviewees in that batch see it)

---

### 7.7 My Profile (`/reviewee/profile`)

**Purpose:** The Learner Profiling Module data, plus personal account information. This is both a viewing screen and an editing interface.

**This page consolidates "Learner Profile" and "Account Settings" into one unified profile section with tabs.**

**Tab 1 — Learner Profile**
- Display (read-only by default, with "Edit" button):
  - Name, email (from `users`)
  - Exam level, batch name (from enrollment)
  - Target exam date
  - Available study hours per week
  - Domain self-ratings (shown as a comparison: self-rated vs current M-Elo theta)
  - Preferred study time
  - Primary device
- "Edit Profile" button → allows editing of: target exam date, study hours, preferred study time
- Exam level is NOT user-editable (can only be changed by admin)

**Tab 2 — Account Settings**
- Change display name (first/last name)
- Change password (current password + new password + confirm)
- Email is not editable (email is the identity key)
- Theme preference (light/dark)

**Tab 3 — Privacy & Data**
- Enrolled batch info
- Data usage notice
- "Request data deletion" (sends a request to admin, not instant)

---

### 7.8 Diagnostic Assessment (`/reviewee/diagnostic`)

**This is not a sidebar item. It is a flow-gated page accessed from the onboarding and from a locked state in the dashboard.**

**Pre-exam Screen:**
- Title: "Diagnostic Assessment"
- Exam level label
- Meta pills: Time (45 minutes), Number of questions, Domains covered
- Domain list with question count per domain
- Instructions
- "Begin Assessment" button (only enabled if profile is complete)

**Exam Screen (full-screen, no sidebar):**
- Question counter
- 45-minute countdown timer
- Progress bar
- Question card: domain badge, difficulty badge, flag button, question text, 4 choices
- Navigation grid (numbered buttons: answered / flagged / unanswered states)
- Prev / Next controls
- Submit button → confirmation overlay

**Key difference from practice session:** No immediate feedback after each answer. The diagnostic collects all answers and submits them as a batch at the end. M-Elo updates are computed server-side on submission.

**Post-exam screen:** Redirects to `/reviewee/diagnostic-result`

**Diagnostic Result Screen (`/reviewee/diagnostic-result`):**
- Overall score percentage
- Per-domain score table: Domain | Questions | Correct | Score % | Theta Baseline | Status (Strength / Needs Work)
- "Weak Areas" section: domains where score < 60%
- Recommendation text: "Based on your results, your study plan prioritizes [weak domains]."
- "View My Study Plan" CTA button → `/reviewee/study-plan`

---

## 8. Admin (ACCESS Staff) Dashboard — Module-by-Module Breakdown

### 8.1 Home (`/admin/home`)

**Purpose:** Administrative overview of platform health and reviewee activity.

**Sections:**

#### 8.1.1 Platform Stats Row (4 cards)
| Card | Data |
|---|---|
| Total Enrolled Reviewees | COUNT from enrollments |
| Active Batches | COUNT of active batches |
| Sessions Today | COUNT of practice_sessions where created_at = today |
| Avg. Cohort Readiness | AVG of normalized theta across all active reviewees |

#### 8.1.2 Recent Sign-Ups
- List of last 10 new registrations: name, email, enrollment status, batch, joined date

#### 8.1.3 Domain Weakness Overview (cohort)
- Bar chart: one bar per domain, showing average cohort theta (normalized)
- Identifies which domains are weakest across all active reviewees
- This is the privacy-safe aggregate view — no individual data exposed

#### 8.1.4 Activity Feed
- Recent platform events: "User X completed diagnostic," "New batch created," "5 new announcements posted"

---

### 8.2 Reviewees (`/admin/reviewees`)

**Purpose:** Full list of registered and enrolled reviewees. Detailed individual management.

**List View (`/admin/reviewees`):**
- Search bar (by name or email)
- Filter: All | Enrolled | Pending Enrollment | Diagnostic Complete | Active
- Filter by Batch
- Filter by Exam Level
- Table columns: Name | Email | Batch | Exam Level | Enrolled Date | Diagnostic Status | Last Active | Actions

**Detail View (`/admin/reviewees/:id`):**
- Reviewee's personal info (name, email, exam level, batch, enrolled date)
- Learner Profile summary (target exam date, study hours, device, self-ratings)
- Domain Rating Table: Domain | Current Theta | Normalized % | Status | Sessions Count
- Session History: list of all practice sessions (date, score, domain breakdown)
- Diagnostic Status: Completed/Not Completed, date completed, scores
- Actions: Reset enrollment (remove from batch), Suspend account, View Learner Profile Form responses

---

### 8.3 Batches & Enrollment (`/admin/batches`)

**Purpose:** Manage review cohorts (batches) and the enrollment codes that admit reviewees into them. This is a new section not in the current codebase.

**Batch List View:**
- Table: Batch Name | Exam Level | Start Date | End Date | Status | Total Enrolled | Actions
- "Create New Batch" button

**Create/Edit Batch Modal/Page:**
- Batch name (e.g., "May 2026 Review — Professional")
- Exam level (Professional / Sub-Professional)
- Review period: Start date, End date
- Max reviewees (capacity, optional)
- Status: Draft | Active | Closed

**Enrollment Codes Panel (within a batch view):**
- Generate enrollment codes for this batch
- Table: Code (masked/shown on reveal) | Used By | Used Date | Status (Available / Used / Expired)
- "Generate Codes" button → specify quantity
- "Revoke Code" action (marks it invalid)
- "Export Codes" (download CSV for distribution to reviewees)

---

### 8.4 Question Bank (`/admin/question-bank`)

**Purpose:** Full CRUD management of the question bank. Questions must be tagged with domains and exam level for M-Elo and adaptive distribution to work.

**List View:**
- Search by keyword in question text
- Filter: Domain | Exam Level | Difficulty | Status (Active / Draft / Archived)
- Table: ID | Question Preview | Domain Tags | Difficulty | Exam Level | Status | Actions
- "Add Question" button

**Add/Edit Question Form:**
- Question text (rich text or plain text)
- Answer choices (A, B, C, D — inputs for each)
- Correct answer (radio select)
- Explanation (text field — shown to reviewee after answering in practice mode)
- Domain tags (multi-select: checkboxes for all applicable domains)
- Exam level (Sub-Professional / Professional / Both)
- Difficulty (Easy / Medium / Hard)
- Initial M-Elo difficulty rating (default 1200, admin can set custom)
- Status (Active / Draft)

**Question Detail View:**
- All fields above in read-only mode
- Shows usage stats: times seen in practice, times answered correctly, current M-Elo difficulty rating

---

### 8.5 Learning Materials (`/admin/materials`)

**Purpose:** Upload, organize, and manage all review content made available to reviewees.

**List View:**
- Filter: Domain | Type | Difficulty | Status
- Table: Title | Domain | Type | Difficulty | Est. Time | Status | Actions
- "Upload Material" button

**Add/Edit Material Form:**
- Title
- Domain (select)
- Material type (Lesson Module / Practice Set / Mock Exam / Reference Sheet)
- Difficulty
- Description (short)
- Estimated completion time (minutes)
- Content: upload file (PDF, DOCX) OR paste/type content (rich text) OR external URL
- Status (Published / Draft)

---

### 8.6 Profile Form (`/admin/profile-form`)

**Purpose:** A Google-Forms-like interface that lets ACCESS staff manage the questions in the Learner Profile Form that reviewees fill during onboarding. This enables the institution to add institutional-specific questions (e.g., "How many times have you taken the CSE before?") without developer involvement.

**This module has two sub-sections:**

#### 8.6.1 Form Editor
- Drag-and-drop form builder (or add/remove question blocks in order)
- Field types: Text input, Number input, Date picker, Single select (radio), Multiple select (checkbox), Rating scale (1–5 Likert), Dropdown select
- Fixed/protected fields: Target exam date, Study hours, Domain self-ratings (these are required by the M-Elo system and cannot be removed)
- Custom fields can be added for institutional data collection (not used by the algorithm, stored as JSON in `learner_profile_custom_fields`)
- Reorder questions via drag handle
- Mark fields as Required / Optional
- "Save Form" button → publishes to the onboarding flow

#### 8.6.2 Responses Viewer
- Table of all learner profile submissions (one row per reviewee)
- Columns: Reviewee Name | Submitted Date | [each custom field as a column]
- CSV export
- Click row → shows full individual response

---

### 8.7 Announcements (`/admin/announcements`)

**Purpose:** Post announcements to reviewees. Can be global or batch-specific.

**List View:**
- Table: Title | Target (Global / Batch Name) | Published Date | Status | Actions
- "Create Announcement" button

**Create/Edit Announcement Form:**
- Title
- Body (rich text)
- Target audience: All Reviewees OR specific batch (select)
- Category: General | Schedule | Important
- Schedule publish time (immediately or future date)
- Status: Published / Draft

---

### 8.8 Reports & Analytics (`/admin/reports`)

**Purpose:** Cohort-level data insights for ACCESS program management. Privacy-safe — all data is aggregate only.

**Sections:**

#### 8.8.1 Cohort Performance Overview
- Total reviewees by batch, by exam level
- Average readiness score per batch
- Completion rate (% of enrolled reviewees who have completed the diagnostic)
- Active rate (% of enrolled reviewees with at least 1 session in the last 7 days)

#### 8.8.2 Domain Weakness Map
- Bar chart: domains ranked from weakest to strongest (by average cohort theta)
- Table below: Domain | Avg. Theta | % Reviewees Below Passing | Trend (improving/declining)

#### 8.8.3 Engagement Analytics
- Sessions per day over the past 30 days (line chart)
- Average sessions per active reviewee per week
- Peak usage hours (heatmap or bar chart by hour of day)

#### 8.8.4 Diagnostic Completion Funnel
- Funnel: Registered → Enrolled → Profile Complete → Diagnostic Done → Active
- Drop-off rate at each step

#### 8.8.5 Batch Comparison
- Side-by-side comparison of two batches (if multiple batches exist)
- Metrics: avg readiness, avg sessions, domain weakness distribution

**All data must be computed from aggregation queries. Individual reviewee identities must never appear on this page.**

---

### 8.9 System Settings (`/admin/settings`)

**Purpose:** Platform configuration and admin account management.

**Tabs:**

**Tab 1 — Account**
- Edit admin name
- Change admin password (current + new + confirm)

**Tab 2 — Platform Configuration**
- Platform name display (can override "Hauers" for institutional branding)
- Session question count defaults (default 15 questions per session)
- K-factor values (diagnostic K = 48, standard K = 24) — editable by admin for calibration
- Study plan phase definitions (labels and week ranges)

**Tab 3 — Maintenance**
- Clear stale sessions older than X days (button)
- Archive inactive users (batch from > 2 years ago)
- View system logs (last 100 server errors)

---

## 9. Foundational Database Schema

This is the complete corrected schema for the entire system. Build this in Prisma (`schema.prisma`) — the raw SQL is provided below as the blueprint for the Prisma model definitions.

```sql
-- ============================================================
-- HAUERS — COMPLETE DATABASE SCHEMA
-- MySQL 8.4 LTS
-- ============================================================

-- 1. USERS
CREATE TABLE `users` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `role`              ENUM('reviewee', 'admin') NOT NULL DEFAULT 'reviewee',
  `first_name`        VARCHAR(100) NOT NULL,
  `last_name`         VARCHAR(100) NOT NULL,
  `email`             VARCHAR(255) NOT NULL UNIQUE,
  `password_hash`     VARCHAR(255) NOT NULL,
  `is_verified`       BOOLEAN NOT NULL DEFAULT FALSE,
  `is_enrolled`       BOOLEAN NOT NULL DEFAULT FALSE,
  `is_onboarded`      BOOLEAN NOT NULL DEFAULT FALSE,
  `exam_level`        ENUM('professional', 'subprofessional') DEFAULT NULL,
  `batch_id`          INT DEFAULT NULL,
  `streak`            INT NOT NULL DEFAULT 0,
  `last_active`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. EMAIL VERIFICATIONS (for OTP flow)
CREATE TABLE `email_verifications` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`     INT NOT NULL,
  `otp_hash`    VARCHAR(255) NOT NULL,
  `expires_at`  TIMESTAMP NOT NULL,
  `used`        BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- 3. BATCHES
CREATE TABLE `batches` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `name`          VARCHAR(255) NOT NULL,
  `exam_level`    ENUM('professional', 'subprofessional') NOT NULL,
  `start_date`    DATE NOT NULL,
  `end_date`      DATE NOT NULL,
  `max_capacity`  INT DEFAULT NULL,
  `status`        ENUM('draft', 'active', 'closed') NOT NULL DEFAULT 'draft',
  `created_by`    INT NOT NULL,
  `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);

-- 4. ENROLLMENT CODES
CREATE TABLE `enrollment_codes` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `code`            VARCHAR(50) NOT NULL UNIQUE,
  `batch_id`        INT NOT NULL,
  `max_uses`        INT NOT NULL DEFAULT 1,
  `used_count`      INT NOT NULL DEFAULT 0,
  `expires_at`      TIMESTAMP DEFAULT NULL,
  `is_active`       BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE
);

-- 5. ENROLLMENTS
CREATE TABLE `enrollments` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`           INT NOT NULL,
  `batch_id`          INT NOT NULL,
  `enrollment_code_id` INT DEFAULT NULL,
  `enrolled_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_enrollment` (`user_id`, `batch_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`enrollment_code_id`) REFERENCES `enrollment_codes`(`id`) ON DELETE SET NULL
);

-- 6. DOMAINS
CREATE TABLE `domains` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `code`        VARCHAR(50) NOT NULL UNIQUE,
  `name`        VARCHAR(100) NOT NULL,
  `exam_level`  ENUM('professional', 'subprofessional', 'both') NOT NULL DEFAULT 'both',
  `sort_order`  INT NOT NULL DEFAULT 0
);

-- Seed data for domains
INSERT INTO `domains` (`code`, `name`, `exam_level`, `sort_order`) VALUES
  ('verbal',       'Verbal Ability',     'both',           1),
  ('numerical',    'Numerical Ability',  'both',           2),
  ('clerical',     'Clerical Ability',   'both',           3),
  ('general_info', 'General Information','professional',   4),
  ('analytical',   'Analytical Ability', 'professional',   5);

-- 7. QUESTIONS
CREATE TABLE `questions` (
  `id`                    INT AUTO_INCREMENT PRIMARY KEY,
  `question_text`         TEXT NOT NULL,
  `choice_a`              VARCHAR(500) NOT NULL,
  `choice_b`              VARCHAR(500) NOT NULL,
  `choice_c`              VARCHAR(500) NOT NULL,
  `choice_d`              VARCHAR(500) NOT NULL,
  `correct_choice`        ENUM('a', 'b', 'c', 'd') NOT NULL,
  `explanation`           TEXT DEFAULT NULL,
  `difficulty`            ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
  `exam_level`            ENUM('professional', 'subprofessional', 'both') NOT NULL DEFAULT 'both',
  `melo_difficulty`       FLOAT NOT NULL DEFAULT 1200.0,
  `status`                ENUM('active', 'draft', 'archived') NOT NULL DEFAULT 'active',
  `created_by`            INT DEFAULT NULL,
  `created_at`            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- 8. QUESTION_DOMAINS (multi-domain tagging — needed for M-Elo multi-concept updates)
CREATE TABLE `question_domains` (
  `question_id`   INT NOT NULL,
  `domain_id`     INT NOT NULL,
  `weight`        FLOAT NOT NULL DEFAULT 1.0,
  PRIMARY KEY (`question_id`, `domain_id`),
  FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON DELETE CASCADE
);

-- 9. LEARNER PROFILES
CREATE TABLE `learner_profiles` (
  `id`                      INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`                 INT NOT NULL UNIQUE,
  `target_exam_date`        DATE DEFAULT NULL,
  `study_hours_per_week`    FLOAT NOT NULL DEFAULT 5.0,
  `preferred_study_time`    ENUM('morning', 'afternoon', 'evening') DEFAULT NULL,
  `primary_device`          ENUM('desktop', 'mobile', 'tablet') DEFAULT NULL,
  `custom_field_responses`  JSON DEFAULT NULL,
  `completed_at`            TIMESTAMP DEFAULT NULL,
  `updated_at`              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- 10. LEARNER_DOMAIN_SELF_RATINGS (part of learner profile — separate for normalization)
CREATE TABLE `learner_domain_self_ratings` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`     INT NOT NULL,
  `domain_id`   INT NOT NULL,
  `self_rating` TINYINT NOT NULL DEFAULT 3,
  UNIQUE KEY `unique_user_domain` (`user_id`, `domain_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON DELETE CASCADE
);

-- 11. DOMAIN RATINGS (live M-Elo theta per user per domain — the core adaptive state)
CREATE TABLE `domain_ratings` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`         INT NOT NULL,
  `domain_id`       INT NOT NULL,
  `theta`           FLOAT NOT NULL DEFAULT 1200.0,
  `k_factor`        FLOAT NOT NULL DEFAULT 24.0,
  `sessions_count`  INT NOT NULL DEFAULT 0,
  `last_updated`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_user_domain_rating` (`user_id`, `domain_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON DELETE CASCADE
);

-- 12. DOMAIN RATING HISTORY (for trend charts — snapshot per session)
CREATE TABLE `domain_rating_history` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`       INT NOT NULL,
  `domain_id`     INT NOT NULL,
  `session_id`    INT DEFAULT NULL,
  `theta`         FLOAT NOT NULL,
  `recorded_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON DELETE CASCADE
);

-- 13. DIAGNOSTIC SESSIONS
CREATE TABLE `diagnostic_sessions` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`           INT NOT NULL,
  `batch_id`          INT NOT NULL,
  `exam_level`        ENUM('professional', 'subprofessional') NOT NULL,
  `total_questions`   INT NOT NULL,
  `correct_count`     INT NOT NULL DEFAULT 0,
  `time_taken_s`      INT DEFAULT NULL,
  `status`            ENUM('in_progress', 'completed', 'abandoned') NOT NULL DEFAULT 'in_progress',
  `started_at`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completed_at`      TIMESTAMP DEFAULT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE
);

-- 14. DIAGNOSTIC ANSWERS
CREATE TABLE `diagnostic_answers` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `session_id`        INT NOT NULL,
  `question_id`       INT NOT NULL,
  `selected_choice`   ENUM('a', 'b', 'c', 'd') DEFAULT NULL,
  `is_correct`        BOOLEAN DEFAULT NULL,
  `time_spent_ms`     INT DEFAULT NULL,
  `answered_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`session_id`) REFERENCES `diagnostic_sessions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
);

-- 15. PRACTICE SESSIONS
CREATE TABLE `practice_sessions` (
  `id`                      INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`                 INT NOT NULL,
  `batch_id`                INT NOT NULL,
  `session_type`            ENUM('recommended', 'custom') NOT NULL DEFAULT 'recommended',
  `total_questions`         INT NOT NULL,
  `correct_count`           INT NOT NULL DEFAULT 0,
  `time_taken_s`            INT DEFAULT NULL,
  `status`                  ENUM('in_progress', 'completed', 'abandoned') NOT NULL DEFAULT 'in_progress',
  `fatigue_detected`        BOOLEAN NOT NULL DEFAULT FALSE,
  `distribution_mode`       VARCHAR(20) DEFAULT '70_30',
  `started_at`              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completed_at`            TIMESTAMP DEFAULT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE
);

-- 16. SESSION ANSWERS (individual question answers within a practice session)
CREATE TABLE `session_answers` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `session_id`        INT NOT NULL,
  `question_id`       INT NOT NULL,
  `selected_choice`   ENUM('a', 'b', 'c', 'd') DEFAULT NULL,
  `is_correct`        BOOLEAN DEFAULT NULL,
  `theta_delta_json`  JSON DEFAULT NULL,
  `time_spent_ms`     INT DEFAULT NULL,
  `answered_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`session_id`) REFERENCES `practice_sessions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
);

-- 17. STUDY PLANS
CREATE TABLE `study_plans` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`         INT NOT NULL UNIQUE,
  `batch_id`        INT NOT NULL,
  `generated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_adjusted`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `adjustment_log`  JSON DEFAULT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE
);

-- 18. STUDY PLAN WEEKS
CREATE TABLE `study_plan_weeks` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `plan_id`       INT NOT NULL,
  `week_number`   INT NOT NULL,
  `week_start`    DATE NOT NULL,
  `week_end`      DATE NOT NULL,
  `phase_label`   VARCHAR(100) DEFAULT NULL,
  FOREIGN KEY (`plan_id`) REFERENCES `study_plans`(`id`) ON DELETE CASCADE
);

-- 19. STUDY PLAN DAYS
CREATE TABLE `study_plan_days` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `week_id`       INT NOT NULL,
  `day_of_week`   TINYINT NOT NULL,
  `domain_id`     INT NOT NULL,
  `focus_label`   VARCHAR(100) DEFAULT NULL,
  `est_minutes`   INT NOT NULL DEFAULT 30,
  `is_rest_day`   BOOLEAN NOT NULL DEFAULT FALSE,
  `is_completed`  BOOLEAN NOT NULL DEFAULT FALSE,
  `completed_at`  TIMESTAMP DEFAULT NULL,
  FOREIGN KEY (`week_id`) REFERENCES `study_plan_weeks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`)
);

-- 20. MATERIALS
CREATE TABLE `materials` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `domain_id`     INT NOT NULL,
  `type`          ENUM('lesson_module', 'practice_set', 'mock_exam', 'reference_sheet') NOT NULL,
  `title`         VARCHAR(255) NOT NULL,
  `description`   TEXT DEFAULT NULL,
  `difficulty`    ENUM('basic', 'intermediate', 'advanced') NOT NULL DEFAULT 'intermediate',
  `exam_level`    ENUM('professional', 'subprofessional', 'both') NOT NULL DEFAULT 'both',
  `content_url`   VARCHAR(500) DEFAULT NULL,
  `est_minutes`   INT DEFAULT NULL,
  `status`        ENUM('published', 'draft') NOT NULL DEFAULT 'published',
  `uploaded_by`   INT DEFAULT NULL,
  `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`),
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- 21. ANNOUNCEMENTS
CREATE TABLE `announcements` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `title`         VARCHAR(255) NOT NULL,
  `body`          TEXT NOT NULL,
  `category`      ENUM('general', 'schedule', 'important') NOT NULL DEFAULT 'general',
  `target_type`   ENUM('all', 'batch') NOT NULL DEFAULT 'all',
  `target_batch_id` INT DEFAULT NULL,
  `published_by`  INT NOT NULL,
  `status`        ENUM('published', 'draft') NOT NULL DEFAULT 'draft',
  `publish_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`target_batch_id`) REFERENCES `batches`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`published_by`) REFERENCES `users`(`id`)
);

-- 22. ANNOUNCEMENT READS (track who has read what)
CREATE TABLE `announcement_reads` (
  `user_id`           INT NOT NULL,
  `announcement_id`   INT NOT NULL,
  `read_at`           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `announcement_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON DELETE CASCADE
);

-- 23. PROFILE FORM FIELDS (dynamic Learner Profile form managed by admin)
CREATE TABLE `profile_form_fields` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `field_key`     VARCHAR(100) NOT NULL UNIQUE,
  `label`         VARCHAR(255) NOT NULL,
  `field_type`    ENUM('text', 'number', 'date', 'radio', 'checkbox', 'rating', 'select') NOT NULL,
  `options_json`  JSON DEFAULT NULL,
  `is_required`   BOOLEAN NOT NULL DEFAULT FALSE,
  `is_protected`  BOOLEAN NOT NULL DEFAULT FALSE,
  `sort_order`    INT NOT NULL DEFAULT 0,
  `is_active`     BOOLEAN NOT NULL DEFAULT TRUE
);

-- SEED: Admin user
INSERT INTO `users` (`id`, `role`, `first_name`, `last_name`, `email`, `password_hash`, `is_verified`)
VALUES (1, 'admin', 'ACCESS', 'Admin', 'admin@hauers.com', '$2b$10$[bcrypt_hash_here]', 1);
```

---

## 10. M-Elo Engine Service — Implementation Specification

The M-Elo Engine is a Node.js service module (not an Express route) that is called by the session answer controller. It must be placed at `services/melo-engine.js`.

### 10.1 Core Function Signature

```javascript
/**
 * Computes M-Elo rating updates for a single answered question.
 *
 * @param {object} params
 * @param {number} params.userId
 * @param {number} params.questionId
 * @param {boolean} params.isCorrect
 * @param {Array<{domainId: number, theta: number, kFactor: number}>} params.currentRatings
 *   - Array of the user's current ratings for all domains tagged to this question
 * @param {number} params.questionDifficulty - Current M-Elo difficulty of the question (theta_item)
 *
 * @returns {object}
 *   - updatedDomainRatings: Array<{domainId, newTheta, delta}>
 *   - updatedQuestionDifficulty: number
 *   - expectedProbability: number
 */
function computeMeloUpdate({ userId, questionId, isCorrect, currentRatings, questionDifficulty }) {
  // Step 1: Compute mean learner theta across all tagged domains
  const thetaLearner = currentRatings.reduce((sum, r) => sum + r.theta, 0) / currentRatings.length;

  // Step 2: Compute expected probability (logistic function)
  const expectedProbability = 1 / (1 + Math.pow(10, (questionDifficulty - thetaLearner) / 400));

  // Step 3: Compute outcome (1 = correct, 0 = incorrect)
  const outcome = isCorrect ? 1 : 0;

  // Step 4: Compute raw delta (before normalization)
  const n = currentRatings.length; // number of domain tags

  const updatedDomainRatings = currentRatings.map(rating => {
    const k = rating.kFactor;
    // Delta for each domain, divided by n (normalization factor)
    const delta = (k / n) * (outcome - expectedProbability);
    const newTheta = rating.theta + delta;
    return {
      domainId: rating.domainId,
      newTheta: newTheta,
      delta: delta,
      oldTheta: rating.theta
    };
  });

  // Step 5: Update question difficulty in opposite direction
  // Use average K-factor across domains
  const avgK = currentRatings.reduce((sum, r) => sum + r.kFactor, 0) / n;
  const questionDelta = (avgK / n) * -(outcome - expectedProbability);
  const updatedQuestionDifficulty = questionDifficulty + questionDelta;

  return {
    updatedDomainRatings,
    updatedQuestionDifficulty,
    expectedProbability
  };
}
```

### 10.2 K-Factor Rules

| Session Type | K-Factor | Rationale |
|---|---|---|
| Diagnostic Assessment | 48 | Elevated for rapid calibration from 1200 baseline |
| Practice Sessions (first 10 sessions) | 32 | Still calibrating, faster adjustment |
| Practice Sessions (> 10 sessions) | 24 | Standard, steady adjustment |
| Short-term review (< 2 weeks to exam) | 36 | Time-aware: more responsive |

The K-factor for each domain rating is stored in the `domain_ratings.k_factor` column and updated by the service after each session milestone.

### 10.3 Persistence After Each Answer

For each answer in a practice session:
1. Call `computeMeloUpdate()`
2. For each domain in `updatedDomainRatings`:
   - `UPDATE domain_ratings SET theta = newTheta WHERE user_id = ? AND domain_id = ?`
3. `UPDATE questions SET melo_difficulty = updatedQuestionDifficulty WHERE id = ?`
4. Insert into `domain_rating_history` (snapshot for trend charts)
5. Insert into `session_answers` with `theta_delta_json` = JSON of all domain deltas

---

## 11. Rule-Based Content Recommender — Implementation Specification

Location: `services/content-recommender.js`

### 11.1 Study Consistency Indicator Computation

```javascript
/**
 * Computes the Study Consistency Indicator for a user.
 * Returns: { score: 0-100, label: string, fatigueDetected: boolean }
 */
async function computeStudyConsistencyIndicator(userId) {
  // Fetch last 7 days of session activity
  // Fetch score trends (last 5 sessions per domain)
  // Compute:
  //   - sessionFrequency: sessions per day in last 7 days (target: ≥ 1/day)
  //   - scoreTrend: average delta across last 5 sessions per domain
  //   - consecutiveErrorRate: % of last 10 answers that were wrong
  
  // Fatigue is detected when:
  //   - Score trend is declining across 3 or more consecutive sessions, OR
  //   - consecutiveErrorRate > 70% for last 10 answers
}
```

### 11.2 Question Selection Logic

```javascript
/**
 * Selects questions for the next adaptive practice session.
 * Applies 70/30 distribution (or adjusted ratio based on SCI).
 *
 * @param {number} userId
 * @param {number} sessionSize - Total questions (default 15)
 * @param {string} examLevel - 'professional' or 'subprofessional'
 * @returns {Array<questionId>} - Ordered list of question IDs for the session
 */
async function selectSessionQuestions(userId, sessionSize = 15, examLevel) {
  const domainRatings = await getDomainRatings(userId); // from domain_ratings table
  const sci = await computeStudyConsistencyIndicator(userId);

  // Determine distribution ratio
  let weakRatio = 0.70; // default 70/30
  if (sci.fatigueDetected) {
    weakRatio = 0.50; // shift toward stronger domains on fatigue
  } else if (sci.score >= 80) {
    weakRatio = 0.80; // concentrate on weak domains when performing well
  }

  // Sort domains by theta ascending (weakest first)
  const sortedDomains = domainRatings.sort((a, b) => a.theta - b.theta);
  
  // Categorize: weakest domains get weakRatio of questions, rest get (1 - weakRatio)
  const weakDomainCount = Math.ceil(sortedDomains.length / 2);
  const weakDomains = sortedDomains.slice(0, weakDomainCount);
  const strongDomains = sortedDomains.slice(weakDomainCount);

  const weakQuestionCount = Math.round(sessionSize * weakRatio);
  const strongQuestionCount = sessionSize - weakQuestionCount;

  // Fetch questions from each domain bucket
  // Prioritize questions nearest to user's theta (appropriate difficulty)
  // Exclude recently seen questions (last 2 sessions)
  const weakQuestions = await fetchQuestionsNearTheta(weakDomains, weakQuestionCount, examLevel);
  const strongQuestions = await fetchQuestionsNearTheta(strongDomains, strongQuestionCount, examLevel);

  return shuffleArray([...weakQuestions, ...strongQuestions]);
}
```

### 11.3 Material Recommendation

After each session, recommend materials for the user's weakest domain:
```javascript
async function getRecommendedMaterials(userId, limit = 5) {
  const domainRatings = await getDomainRatings(userId);
  const weakestDomainId = domainRatings.sort((a, b) => a.theta - b.theta)[0].domainId;
  
  return await db.query(`
    SELECT * FROM materials 
    WHERE domain_id = ? AND status = 'published'
    ORDER BY difficulty ASC
    LIMIT ?
  `, [weakestDomainId, limit]);
}
```

---

## 12. Access Control and Middleware Rules

### 12.1 Middleware Stack

| Middleware | File | Description |
|---|---|---|
| `requireAuth` | `middleware/requireAuth.js` | Redirects to `/login` if no session |
| `requireAdmin` | `middleware/requireAdmin.js` | Returns 403 if role !== 'admin' |
| `requireReviewee` | `middleware/requireReviewee.js` | Returns 403 if role !== 'reviewee' |
| `requireEnrolled` | `middleware/requireEnrolled.js` | Redirects to enrollment prompt if `is_enrolled = false` |
| `requireOnboarded` | `middleware/requireOnboarded.js` | Redirects to onboarding flow if `is_onboarded = false` |
| `requireDiagnosticComplete` | `middleware/requireDiagnosticComplete.js` | Redirects to diagnostic gate if no completed diagnostic session |
| `injectUser` | `middleware/injectUser.js` | Attaches `req.user` from session + DB lookup |

### 12.2 Route Guard Matrix

| Route | requireAuth | requireAdmin | requireReviewee | requireOnboarded | requireEnrolled | requireDiagnosticComplete |
|---|---|---|---|---|---|---|
| `/admin/*` | ✓ | ✓ | | | | |
| `/reviewee/onboarding` | ✓ | | ✓ | | | |
| `/reviewee/diagnostic` | ✓ | | ✓ | ✓ | ✓ | |
| `/reviewee/dashboard` | ✓ | | ✓ | ✓ | | |
| `/reviewee/review` | ✓ | | ✓ | ✓ | ✓ |
| `/reviewee/progress` | ✓ | | ✓ | ✓ | ✓ |
| `/reviewee/study-plan` | ✓ | | ✓ | ✓ | ✓ |
| `/reviewee/materials` | ✓ | | ✓ | ✓ | ✓ |
| `/reviewee/profile` | ✓ | | ✓ | ✓ | |
| `/reviewee/settings` | ✓ | | ✓ | | |
| `/reviewee/announcements` | ✓ | | ✓ | ✓ | |

---

## 13. API Route Map

### 13.1 Auth Routes

| Method | Path | Description |
|---|---|---|
| GET | `/login` | Login page |
| POST | `/auth/login` | Process login |
| GET | `/signup` | Signup page |
| POST | `/auth/signup` | Process registration |
| GET | `/signup-success` | OTP entry page |
| POST | `/auth/verify-otp` | Verify OTP |
| GET | `/forgot-password` | Forgot password page |
| POST | `/auth/forgot-password` | Send reset OTP |
| POST | `/auth/reset-password` | Update password |
| POST | `/auth/logout` | Destroy session |

### 13.2 Reviewee Page Routes

| Method | Path | Description |
|---|---|---|
| GET | `/reviewee/onboarding` | Onboarding enrollment code page |
| GET | `/reviewee/dashboard` | Dashboard page |
| GET | `/reviewee/diagnostic` | Diagnostic pre-exam screen |
| GET | `/reviewee/diagnostic-result` | Diagnostic result screen |
| GET | `/reviewee/review` | Session launcher |
| GET | `/reviewee/review/session` | Active session (served from same page, JS-driven) |
| GET | `/reviewee/progress` | Progress analytics page |
| GET | `/reviewee/study-plan` | Study plan page |
| GET | `/reviewee/materials` | Materials library |
| GET | `/reviewee/announcements` | Announcements |
| GET | `/reviewee/profile` | Learner profile + account settings |

### 13.3 Reviewee API Routes

| Method | Path | Description |
|---|---|---|
| POST | `/reviewee/api/enroll` | Submit enrollment code |
| POST | `/reviewee/api/profile` | Save learner profile |
| GET | `/reviewee/api/dashboard` | Dashboard data |
| GET | `/reviewee/api/diagnostic/questions` | Diagnostic questions (no answers) |
| POST | `/reviewee/api/diagnostic/submit` | Submit full diagnostic |
| POST | `/reviewee/api/session/start` | Create new practice session |
| POST | `/reviewee/api/session/answer` | Submit single answer (M-Elo update) |
| POST | `/reviewee/api/session/finish` | Finalize session |
| GET | `/reviewee/api/session/:id/result` | Session result data |
| GET | `/reviewee/api/progress` | Progress analytics data |
| GET | `/reviewee/api/study-plan` | Study plan data |
| GET | `/reviewee/api/materials` | Materials list |
| GET | `/reviewee/api/announcements` | Announcements |
| POST | `/reviewee/api/announcements/:id/read` | Mark announcement read |
| GET | `/reviewee/api/profile` | Profile data |
| PUT | `/reviewee/api/profile` | Update profile |
| PUT | `/reviewee/api/password` | Change password |

### 13.4 Admin Page Routes

| Method | Path | Description |
|---|---|---|
| GET | `/admin/home` | Admin dashboard page |
| GET | `/admin/reviewees` | Reviewee list page |
| GET | `/admin/reviewees/:id` | Reviewee detail page |
| GET | `/admin/batches` | Batches list page |
| GET | `/admin/batches/new` | Create batch page |
| GET | `/admin/batches/:id` | Batch detail page |
| GET | `/admin/question-bank` | Question bank list |
| GET | `/admin/question-bank/new` | Add question page |
| GET | `/admin/question-bank/:id` | Question detail page |
| GET | `/admin/materials` | Materials list |
| GET | `/admin/profile-form` | Profile form editor |
| GET | `/admin/announcements` | Announcements list |
| GET | `/admin/reports` | Reports & analytics page |
| GET | `/admin/settings` | System settings page |

### 13.5 Admin API Routes

| Method | Path | Description |
|---|---|---|
| GET | `/admin/api/dashboard` | Dashboard stats |
| GET | `/admin/api/reviewees` | All reviewees |
| GET | `/admin/api/reviewees/:id` | Single reviewee detail |
| POST | `/admin/api/batches` | Create batch |
| PUT | `/admin/api/batches/:id` | Update batch |
| POST | `/admin/api/batches/:id/codes` | Generate enrollment codes |
| DELETE | `/admin/api/batches/:id/codes/:codeId` | Revoke code |
| GET | `/admin/api/questions` | All questions |
| POST | `/admin/api/questions` | Create question |
| PUT | `/admin/api/questions/:id` | Update question |
| DELETE | `/admin/api/questions/:id` | Archive question |
| GET | `/admin/api/materials` | All materials |
| POST | `/admin/api/materials` | Upload material |
| PUT | `/admin/api/materials/:id` | Update material |
| GET | `/admin/api/profile-form` | Get current form fields |
| PUT | `/admin/api/profile-form` | Save form fields |
| GET | `/admin/api/profile-form/responses` | All profile responses |
| GET | `/admin/api/announcements` | All announcements |
| POST | `/admin/api/announcements` | Create announcement |
| PUT | `/admin/api/announcements/:id` | Update announcement |
| GET | `/admin/api/reports` | Cohort analytics data |

---

## 14. Title Defense Build Priority

Given time constraints, build in this exact order. The goal is: **a complete, navigable system that demonstrates every module flow, even if not all backend logic is live.**

### Priority 1 — Database Foundation (Do This First)
- [ ] Run the new complete schema.sql
- [ ] Seed: admin user (bcrypt hashed), 2 test domains (verbal, numerical), 1 batch, 1 enrollment code, 2 reviewee users, 10 sample questions tagged to domains
- [ ] Migrate from raw mysql2 queries to Prisma (or keep mysql2 but use the new schema correctly)

### Priority 2 — Fix the Auth Flow
- [x] `POST /auth/signup`: real DB insert with bcrypt hash
- [x] `POST /auth/verify-otp`: (BYPASSED for demo) real DB OTP check
- [x] `POST /auth/login`: update to use `password_hash` field with bcrypt compare

### Priority 3 — Implement the Enrollment Code Flow
- [x] Create the onboarding page (restored to original design)
- [x] Make Enrollment Code optional during onboarding but required for system access/pre-test
- [x] `POST /reviewee/api/profile`: save profile, and if provided, validate code and enroll user
- [x] Dashboard prompts to enter enrollment code if not yet enrolled

### Priority 4 — Learner Profile Form
- [x] Create `learner_profiles` table records on form submission
- [x] Save domain self-ratings to `learner_domain_self_ratings`
- [x] Update `users` table with First and Last name
- [x] Onboarding flow: original profile flow → optional enrollment code → skip or diagnostic gate

### Priority 5 — Diagnostic Assessment (Real, Not Mock)
- [x] Serve real questions from DB filtered by exam level
- [x] On submit: run M-Elo updates for each answer (use the services/melo-engine.js)
- [x] Persist domain_ratings, diagnostic_session, diagnostic_answers
- [x] Generate a simple study plan from domain ratings (can be basic for title defense)
- [x] Show real diagnostic results page

### Priority 6 — Practice Session (Real, Not Mock)
- [x] Session launcher with real domain ratings displayed
- [x] `POST /reviewee/api/session/start`: create session record, fetch questions via content recommender
- [x] `POST /reviewee/api/session/answer`: M-Elo update per answer, immediate feedback returned
- [x] Session result page with real domain deltas

### Priority 7 — Dashboard (Real Data)
- [x] Wire `/reviewee/api/dashboard` to real DB queries:
  - Readiness score from domain_ratings
  - Streak from users table
  - Session count from practice_sessions
  - Days until exam from learner_profiles
  - Domain breakdown from domain_ratings
- [x] Remove all mock-*.js data dependencies from this route

### Priority 8 — Progress Page (Real Charts)
- [x] Wire domain competency trend from domain_rating_history
- [x] Wire session history from practice_sessions
- [x] Study consistency indicator (even a simple version: sessions in last 7 days)

### Priority 9 — Admin: Batches & Enrollment
- [x] Batch list and creation form (DB-backed)
- [x] Enrollment code generation (create codes table records)
- [x] Display enrolled reviewees per batch

### Priority 10 — Admin: Reports (Aggregate Queries)
- [x] Average theta per domain across cohort
- [x] Enrollment funnel stats
- [x] Session activity chart data

### Priority 11 — UI Polish for Defense
- [ ] Consistent sidebar active states on both dashboards
- [ ] Loading states and empty states on all data-dependent pages
- [ ] Remove all hardcoded mock data from views
- [ ] Mobile responsive check on key pages

---

## Appendix: What Chapter 3 Mentions vs. What Must Be In the System

| Chapter 3 Feature | Module | In Current Code? | Priority |
|---|---|---|---|
| Learner Profiling Form | Learner Profiling | Partial (no DB) | P4 |
| Domain self-ratings input | Learner Profiling | No | P4 |
| Diagnostic Assessment (real questions, timed) | Diagnostic | Partial (15 mock q's) | P5 |
| M-Elo update on each answer | Diagnostic + ACE | No | P5 |
| Elevated K-factor (48) for diagnostic | Diagnostic | No | P5 |
| Multi-domain question tagging | Diagnostic + ACE | No | P1 (schema) |
| Professional level (5 domains) | All | No (only 3) | P1 (schema) |
| Study Plan generation from ratings | ACE | Mock data | P5 |
| 70/30 adaptive distribution | ACE | No | P6 |
| Study Consistency Indicator | ACE | No | P6 |
| Fatigue detection + ratio shift | ACE | No | P6 |
| Domain Competency Trend Chart | Analytics | Mock data | P8 |
| Exam Readiness Indicator | Analytics | Partial (mock) | P7 |
| Study Consistency display | Analytics | No | P8 |
| Cohort aggregate view (admin) | Analytics | Partial (mocked 34%) | P10 |
| Enrollment code system | Auth/Onboarding | No | P3 |
| Batch management | Admin | No | P9 |
| Role-based access (FT-24: 403) | Auth | Partial | P3 |
| Profile Form builder (admin) | Admin | UI only | P8 |
| Announcements | Content | No DB | P11 |
| Privacy-safe admin analytics | Analytics | No | P10 |

---

*Document prepared for HAUERS Title Defense preparation · CSPC · Team Hauers · 2026*
