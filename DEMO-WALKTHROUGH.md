# Hauers End-to-End Demo Walkthrough

This guide is designed for a single, continuous screen recording that shows how Hauers works from reviewee onboarding to admin management.

It covers:
- Sign up
- Login
- Forgot password
- Email verification
- Reviewee journey (onboarding, diagnostic, dashboard, learning tools)
- Admin journey (users, question bank, announcements)

## 1. Demo Goal and Recommended Runtime

Target runtime: 18 to 30 minutes.

Suggested flow:
1. Public and authentication flows
2. Reviewee in-app experience
3. Admin control center
4. Cross-role proof (admin announcement visible to reviewee)

## 2. Pre-Recording Checklist

Before recording:
1. Open a terminal in the project root.
2. Install dependencies if needed:

   npm install

3. Start the app:

   npm start or npm run dev

4. Open the app at:

   http://localhost:3000

5. Use a clean browser session:
- Open Incognito/Private window, or
- Clear site data for localhost

This avoids old session/localStorage data affecting the demo.

## 3. Demo Accounts You Can Use

Seeded credentials:
- Admin
  - Email: admin@hauers.com
  - Password: 123456
- Reviewee
  - Email: reviewee@hauers.com
  - Password: 123456

Important behavior during sign up:
- The sign up + verify flow is simulated.
- A new reviewee session is created after verification.
- The password entered in sign up is not the one reliably stored for that new user in the mock flow.
- For stable login demonstrations, keep using seeded accounts above.

## 4. Important Prototype Notes (Say This Early in Demo)

Use this short disclaimer in your narration:

"This is a working UI prototype with mock data and session-based simulation. Core screens and role flows are functional, while some backend features like real email delivery and production-grade password reset are intentionally simulated for demo purposes."

Simulated/partial features to remember:
- Email OTP delivery is simulated in UI.
- Forgot password flow is UI-driven.
- Reset password page redirects to login in this prototype flow.
- Most dashboard data is mock-driven.

## 5. Continuous Recording Script (Scene-by-Scene)

Use this as your exact runbook.

### Scene A: Landing to Sign Up (2 to 3 minutes)

What to do:
1. Start at /
2. Briefly scroll landing page to show branding and purpose.
3. In the address bar, type a non-existent route (example: /demo-not-found) and press Enter to show the custom 404 page.
4. Briefly explain the fallback handling, then return to home (/).
5. Open Sign up.
6. Fill sample values:
   - Email: demo@acc.com
   - Password: any sample value (6 digits)
   - Confirm Password: same sample value
7. Click Sign up.

What to say:
- "Users start at the landing page, then create an account through a guided sign-up flow."
- "The platform supports a modern authentication UI with terms/privacy links and theme support."
- "We also handle unknown URLs gracefully through a dedicated 404 page so navigation failures are clear to users."

### Scene B: Email Verification Flow (2 to 3 minutes)

What to do:
1. On signup-success page, enter any 6 digits in OTP fields.
2. Click Verify email.
3. On email-verified page, click Continue to Profile Setup.

What to say:
- "After registration, users verify their email through a 6-digit OTP screen."
- "In this prototype, OTP dispatch is simulated to demonstrate user experience and flow continuity."

### Scene C: Reviewee Onboarding Wizard (3 to 5 minutes)

What to do:
1. Complete Step 1 (Identity):
   - First Name, Last Name
   - Birth date
   - Sex
   - Type of reviewee (student/alumni/employee)
   - Fill dynamic fields that appear
2. Click Continue.
3. Step 2 (Exam):
   - Target Exam Level
   - Target Exam Date
4. Click Continue.
5. Step 3 (Preferences):
   - Preferred study time
   - Study hours slider
   - Preferred study days
   - Confidence slider
   - Struggling areas
6. Click Continue.
7. In completion view, click Start Pre-Diagnostic.

What to say:
- "The onboarding collects identity, exam targeting, and study preferences."
- "These inputs shape the learner context used by later recommendation screens."

### Scene D: Diagnostic Exam and Results (4 to 5 minutes)

What to do:
1. On Diagnostic intro, click Begin Assessment.
2. Answer a few questions.
3. Flag one question.
4. Use question nav grid to jump around.
5. Click Submit.
6. In confirmation modal, click Submit Now.
7. On result page, point to:
   - Overall score
   - Domain breakdown
   - Weak areas and recommended focus

What to say:
- "The diagnostic gives an initial competency snapshot across core domains."
- "Question-level controls include flagging and free navigation before submission."
- "The result highlights weak domains that feed the study plan focus."

### Scene E: Reviewee Dashboard and Learning Features (4 to 6 minutes)

What to do:
1. Go to Dashboard.
2. Highlight:
   - Readiness score ring
   - Countdown
   - Streak
   - Quick actions
3. Open Study Plan and show weekly tasks.
4. Open Materials:
   - Use search
   - Use domain/type filters
5. Open Progress and show charts/stats.
6. Open Learner Profile.
7. Open Account Settings and show editable profile fields.

What to say:
- "After diagnostic, the reviewee lands in a data-rich dashboard with next actions."
- "The study plan and materials views support practical day-to-day preparation."
- "Progress and profile pages support tracking and personalization."

### Scene F: Logout, Forgot Password, Reset Flow (2 to 3 minutes)

What to do:
1. Log out to return to login.
2. Click Forgot password?.
3. Enter reviewee@hauers.com and submit.
4. In OTP step, enter any 6 digits and click Verify code.
5. On reset-password page, enter new password values and click Reset password.
6. Observe redirect to login.
7. Log in using reviewee@hauers.com / 123456.

What to say:
- "The forgot-password UX is multi-step with email and OTP verification screens."
- "For this prototype, it demonstrates interaction and recovery journey in UI form."

Important note:
- Use 123456 for seeded reviewee login after this scene to keep the demo stable.

### Scene G: Switch to Admin Experience (5 to 7 minutes)

What to do:
1. Log out.
2. Log in as admin:
   - admin@hauers.com
   - 123456
3. In Admin Dashboard, show KPI cards and quick actions.
4. Open Users page:
   - Use search input
   - Use filter chips
   - Open one user detail page
5. Open Question Bank:
   - Search by keyword
   - Filter by domain/difficulty
   - Open Add Question modal
   - Fill sample values (you may save or cancel)
6. Open Analytics briefly.
7. Open Materials Library briefly.

What to say:
- "Admin has centralized visibility over users, content, and overall readiness trends."
- "Question management includes search, filtering, and modal-based content operations."

### Scene H: Admin-to-Reviewee Cross-Role Proof (Strong Ending) (2 to 3 minutes)

What to do:
1. Still as admin, open Announcements.
2. Click New Announcement.
3. Create sample broadcast:
   - Title: Exam Week Advisory
   - Message: Please complete Numerical Ability drills before Friday.
   - Link: /reviewee/study-plan
   - Priority: Urgent
4. Post to Dashboard.
5. Log out.
6. Log in as reviewee (reviewee@hauers.com / 123456).
7. Open reviewee dashboard and show broadcast banner appears.

What to say:
- "This shows role integration: admin broadcasts are surfaced directly in the reviewee dashboard experience."
- "It demonstrates communication and intervention workflows across user roles."

### Scene I: Full Feature Coverage Pass (Add-on Segment) (8 to 12 minutes)

Use this segment when you need to explicitly show all major sections for panel/QA defense.

#### I.1 Reviewee: Materials (deep walkthrough)

What to do:
1. Open /reviewee/materials.
2. Show the default list and card layout.
3. In search, type a keyword (example: numerical).
4. Apply domain filter and then type filter.
5. Open one material item and discuss how reviewees consume it.
6. Clear filters and show results return.

What to say:
- "Materials supports searchable and filterable content so learners can focus on weak domains quickly."
- "This is where reviewees access references, videos, and guided resources."

#### I.2 Reviewee: Study Plan (deep walkthrough)

What to do:
1. Open /reviewee/study-plan.
2. Show weekly structure and per-day tasks.
3. Mark or unmark one task/checkpoint if available in UI.
4. Explain how this connects to diagnostic weak areas.

What to say:
- "Study Plan operationalizes diagnostic results into a weekly execution routine."
- "Learners can track what to do today instead of guessing what to study next."

#### I.3 Reviewee: Progress (deep walkthrough)

What to do:
1. Open /reviewee/progress.
2. Highlight charts, domain trends, and summary stats.
3. Point out how progress indicates readiness movement over time.

What to say:
- "Progress visualizes consistency and score movement, not just a single exam result."
- "This gives both learner and admin measurable evidence of improvement."

#### I.4 Reviewee: Learner Profile + Editing Profile

What to do:
1. Open /reviewee/learner-profile and show profile summary.
2. Open /reviewee/settings.
3. Update first name/last name/email/exam level.
4. Save changes and show confirmation.
5. Return to dashboard/profile to confirm updated values appear.

What to say:
- "Profile and account settings allow controlled personalization of learner identity and exam track."
- "Updates are reflected in session and persisted in the mock data flow for demo continuity."

#### I.5 Reviewee: Account Settings (password update)

What to do:
1. Stay on /reviewee/settings.
2. Go to password change section.
3. Fill current password, new password, confirm password.
4. Save and show success/error handling.
5. Mention you will keep demo login stable using seeded password if needed.

What to say:
- "Account settings includes password update and input validation behavior."
- "For consistent demo playback, seeded credentials are retained when re-logging across scenes."

#### I.6 Reviewee: Terms of Use and Privacy Policy

What to do:
1. From reviewee sidebar footer, open Privacy Policy.
2. Return and open Terms of Service.
3. Scroll each page briefly to show structured legal sections.
4. Mention public vs authenticated legal pages are both available.

What to say:
- "The system includes dedicated legal surfaces for privacy and terms, available in both public and authenticated contexts."
- "This is important for compliance and user trust."

#### I.7 Reviewee: Notifications / Announcements Visibility

What to do:
1. Go back to /reviewee/dashboard.
2. Point to the announcement banner (if an admin broadcast exists).
3. Click its CTA link if present (example: /reviewee/study-plan).

What to say:
- "Reviewees receive admin communications directly on dashboard as high-visibility alerts."
- "This acts as the notification channel for time-sensitive guidance."

#### I.8 Admin: Users Management (deep walkthrough)

What to do:
1. Log in as admin and open /admin/reviewees.
2. Show KPI cards (total, verified, professional, sub-professional).
3. Search a user by name/email.
4. Apply Level, Engagement, and Status filters.
5. Open a specific user detail page (/admin/reviewees/:id).

What to say:
- "Users management combines discovery, segmentation, and individual learner drill-down."
- "Admins can quickly identify inactive, at-risk, or unverified users."

#### I.9 Admin: Question Bank Management (deep walkthrough)

What to do:
1. Open /admin/question-bank.
2. Show KPI counts per domain.
3. Search by keyword.
4. Filter by domain and difficulty.
5. Open Add Question modal and fill all fields:
   - question text
   - domain
   - difficulty
   - choices A-D
   - correct answer
6. Save or cancel (either is fine for demo).
7. Open one question detail page (/admin/question-bank/:id).

What to say:
- "Question Bank supports item authoring, cataloging, and quality review through filters and detail views."
- "This is the core content-governance area for exam preparation material."

#### I.10 Admin: Materials Library Management

What to do:
1. Open /admin/materials.
2. Show KPI cards and materials table.
3. Use search and filter chips.
4. Open Add Material modal.
5. Fill title, description, domain, type, estimated minutes, difficulty, recommended flag.
6. Save or cancel.

What to say:
- "Admins can curate the resource library and prioritize materials by domain and learner need."
- "This keeps the learning content aligned with diagnostic outcomes."

#### I.11 Admin: Announcements as Notification Management

What to do:
1. Open /admin/announcements.
2. Create one normal and one urgent announcement.
3. Show how active broadcasts are listed and removable.
4. Go to /admin/dashboard and show announcement status widget.

What to say:
- "Announcements are used as the system's practical notification management layer for reviewees."
- "Urgent messages allow admin intervention for schedule changes and critical reminders."

#### I.12 Admin: System Settings / Account Settings

What to do:
1. Open /admin/system-settings.
2. Edit admin profile fields and save.
3. Demonstrate admin password update fields and validation.

What to say:
- "Admin settings include profile maintenance and account security controls."
- "This ensures administrative ownership and secure access management."

#### I.13 Optional Legal and Footer Validation (Admin View)

What to do:
1. In admin sidebar footer, briefly show System Settings and Help/Support.
2. Mention reviewee-side legal pages are already shown in I.6.

What to say:
- "Navigation includes role-appropriate utility links for governance and support."

#### I.14 Suggested Sequence to Keep This Segment Smooth

Use this exact order for no backtracking:
1. Reviewee: Dashboard -> Materials -> Study Plan -> Progress -> Learner Profile -> Settings -> Privacy -> Terms -> Dashboard notifications
2. Admin: Dashboard -> Users -> User Detail -> Question Bank -> Question Detail -> Materials -> Announcements -> Settings -> Dashboard status

This sequence avoids unnecessary re-login loops and keeps the recording coherent.

## 6. Suggested Narration Script (Ready-to-Read)

Use this compressed script if you want smoother voice delivery:

"We start from the public landing page, then go through sign-up and OTP-based email verification. Once verified, the reviewee completes onboarding with identity, exam target, and study preferences. The learner then takes a diagnostic assessment with timer, flagged items, and submission review. Results provide domain-level performance and weak-area recommendations. From there, the dashboard presents readiness score, study tasks, and quick navigation to materials, progress, and study planning. Next, we demonstrate account recovery through forgot password and reset UI. We then switch roles to admin, where we manage users, inspect question bank content, and review platform analytics. Finally, we publish an admin announcement and verify it appears in the reviewee dashboard, showing end-to-end system interaction from learner journey to administrative intervention." 

## 7. Camera and Delivery Tips

1. Keep zoom at 110% to 125% in browser for readability.
2. Pause 1 to 2 seconds after each page load so viewers can absorb UI.
3. Keep cursor movement deliberate and slow.
4. Narrate what the action means, not just what you clicked.
5. If a page is slow, say: "Loading mock data for this view."

## 8. Contingency Plan (If Something Fails Mid-Recording)

If session seems broken:
1. Open /logout
2. Return to /login
3. Log in with seeded account

If UI state is odd (especially announcements/theme):
1. Hard refresh browser
2. Or open a fresh Incognito window

If onboarding feels too long on retake:
1. Use seeded reviewee login and continue from dashboard scenes

## 9. Fast Demo Variant (10 to 12 minutes)

If you need a shorter version:
1. Landing -> Signup -> OTP -> Onboarding (quick fill)
2. Diagnostic intro + submit
3. Dashboard + one page each for Materials and Progress
4. Logout -> Admin login
5. Users + Question Bank
6. Announcement post -> Reviewee dashboard proof

This preserves full story while cutting repetition.

## 10. Final Closing Line for Your Video

"That completes our end-to-end Hauers walkthrough, from reviewee registration and learning workflows to admin-level monitoring, content management, and platform-wide communication." 
