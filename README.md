# Hauers — CSE-PPT Review Platform

A UI prototype / simulation of an adaptive review platform for **CSPC ACCESS** reviewees preparing for the Civil Service Examination – Paper-and-Pencil Test (CSE-PPT).

> **Important:** This is a front-end simulation backed by in-memory mock data. There is no real database, no real email system, and no real authentication security. It is intended as a prototype/demo only.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Page Tour](#page-tour)
- [Simulated Features](#simulated-features)
- [Limitations](#limitations)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)

---

## Quick Start

**Prerequisites:** [Node.js](https://nodejs.org) v18 or later.

Before starting the app, copy `.env.example` to `.env` and fill in the database and Google OAuth values. Reviewee sign-in now expects a Google OAuth client plus a whitelist entry.

```bash
# 1. Clone / download the project
cd hauers

# 2. Install dependencies
npm install

# 3. Start the server
npm start          # production-style: node server.js
# or
npm run dev        # auto-restarts on file change (uses nodemon)

# 4. Open in browser
http://localhost:3000
```

---

## Authentication

There are no pre-seeded user credentials in the live database. The first administrator is created through the bootstrap setup route, and reviewee access is controlled by Google OAuth plus the admin-managed whitelist.

---

## Page Tour

### Public Pages (no login required)

| URL              | Page                  | Description                                      |
|------------------|-----------------------|--------------------------------------------------|
| `/`              | Landing               | Hero, features overview, call-to-action          |
| `/login`         | Login                 | Email + password login                           |
| `/signup`        | Sign Up               | Reviewee Google OAuth entry point                |
| `/signup-success`| Sign Up Success       | OTP prompt screen                                |
| `/forgot-password`| Forgot Password      | Multi-step password-reset flow (UI only)         |
| `/reset-password` | Reset Password       | New password entry screen (UI only)              |
| `/email-verified` | Email Verified       | Post-verification confirmation screen            |
| `/terms`         | Terms of Service      | Full legal terms with sticky TOC                 |
| `/privacy`       | Privacy Policy        | Full privacy policy with sticky TOC              |

### Reviewee Pages (requires login as `reviewee`)

| URL                          | Page                | Description                                       |
|------------------------------|---------------------|---------------------------------------------------|
| `/reviewee/dashboard`        | Dashboard           | Readiness score, streak, domain progress          |
| `/reviewee/onboarding`       | Onboarding          | Exam level selection wizard                       |
| `/reviewee/diagnostic`       | Diagnostic Test     | Timed 10-question diagnostic exam                 |
| `/reviewee/diagnostic-result`| Diagnostic Results  | Domain breakdown, weak areas, recommendations     |
| `/reviewee/quiz`             | Practice Quiz       | Domain-filtered practice questions with feedback  |
| `/reviewee/study-plan`       | Study Plan          | Weekly study schedule with progress tracking      |
| `/reviewee/progress`         | Progress Tracker    | Charts and stats for study activity               |
| `/reviewee/review-materials` | Review Materials    | Searchable library of study materials by domain   |
| `/reviewee/learner-profile`  | Learner Profile     | Profile card with stats and domain scores         |
| `/reviewee/settings`         | Account Settings    | Edit name, email, exam level                      |

### Admin Pages (requires login as `admin`)

| URL                            | Page                | Description                                     |
|--------------------------------|---------------------|-------------------------------------------------|
| `/admin/home`                  | Home                | Platform stats, recent signups, activity log    |
| `/admin/reviewees`             | Reviewees           | List of all registered users                    |
| `/admin/reviewees/:id`          | Reviewee Detail     | Individual user stats and profile               |
| `/admin/question-bank`         | Question Bank       | Browse, search, and filter all questions        |
| `/admin/question-bank/:id`     | Question Detail     | Full question view with answer and metadata     |
| `/admin/reports`               | Reports             | Platform-wide performance charts and metrics    |
| `/admin/system-settings`       | System Settings     | Admin account and system configuration          |

---

## Simulated Features

These features work end-to-end in the prototype:

- **Login / Logout** — session-based auth with role-based redirect (admin local password vs reviewee Google OAuth)
- **Practice Quiz** — fetches 15 questions from mock data, shows answers and explanations after each question, tracks score
- **Diagnostic Test** — timed 10-question exam with per-domain scoring
- **Study Plan** — weekly plan rendered from `data/mock-study-plan.js`
- **Progress Tracker** — charts populated from `data/mock-progress.js`
- **Review Materials** — searchable/filterable card library from `data/mock-review-materials.js`
- **Profile Edit** — name, email, and exam level updates persist in the live database
- **Admin Question Search** — live filter by keyword, domain, and difficulty
- **Dark / Light Theme** — toggle persists to `localStorage`
- **Responsive Design** — works on mobile, tablet, and desktop

---

## Limitations

Since this is a mock simulation, many flows are intentionally incomplete:

| Feature                   | Status       | Notes                                                          |
|---------------------------|--------------|----------------------------------------------------------------|
| Sign Up (new account)     | Partial      | Reviewees now use Google OAuth and the whitelist gate          |
| Email verification (OTP)  | UI only      | Legacy local signup flow; not used by the Google OAuth path    |
| Forgot / reset password   | UI only      | No email is sent; the form steps are decorative                |
| Real database             | None         | All data lives in `data/*.js` files loaded into memory         |
| Data persistence          | Partial      | Only profile edits (`/api/profile/update`) write to disk       |
| Quiz scores saved         | No           | Scores are shown in the session but not stored anywhere        |
| Diagnostic scores saved   | No           | Results page shows mock data; your actual answers aren't used  |
| Password hashing          | Bcrypt       | Local admin passwords are hashed before storage                |
| Multi-user isolation      | None         | All reviewees see the same mock dashboard data                 |
| CSC affiliation           | None         | Not affiliated with or endorsed by the Civil Service Commission |

---

## Project Structure

```
hauers/
├── app.js                    # Express app setup, middleware, route mounting
├── server.js                 # HTTP server entry point (port 3000)
├── package.json
│
├── data/                     # In-memory mock data (JSON-style JS modules)
│   ├── live auth users       # Live database users now drive auth
│   ├── mock-questions.js     # Practice/diagnostic questions (15 items, 3 domains)
│   ├── mock-reviewee-dashboard.js
│   ├── mock-diagnostic-results.js
│   ├── mock-study-plan.js
│   ├── mock-progress.js
│   ├── mock-review-materials.js
│   └── mock-admin-dashboard.js
│
├── middleware/
│   ├── logger.js             # Request logger (method + URL + status)
│   ├── injectUser.js         # Attaches req.user from session
│   ├── requireAuth.js        # Redirects to /login if not authenticated
│   └── requireAdmin.js       # Redirects if user is not admin role
│
├── routes/
│   ├── web.js                # Public static pages (/, /terms, /privacy, etc.)
│   ├── auth.js               # Login, logout, signup, OTP, password-reset POSTs
│   ├── reviewee.js           # All /reviewee/* pages and /reviewee/api/* endpoints
│   └── admin.js              # All /admin/* pages and /admin/api/* endpoints
│
├── views/                    # HTML page files served directly
│   └── *.html
│
└── public/                   # Static assets served at /
    ├── css/
    │   ├── base.css          # CSS variables, reset, theme (light/dark)
    │   ├── layout.css        # Sidebar, header, main content layout
    │   ├── landing.css       # Landing page styles
    │   ├── auth.css          # Login / signup / auth flow styles
    │   ├── dashboard.css     # Dashboard card and widget styles
    │   └── legal.css         # Terms and privacy page styles
    ├── js/
    │   ├── main.js           # Header/footer partial injection, navbar init
    │   ├── theme-toggle.js   # Dark/light mode toggle (runs before paint)
    │   ├── dashboard.js      # Dashboard data fetch and render
    │   ├── sidebar.js        # Sidebar active state logic
    │   └── auth.js           # Auth form helpers
    └── partials/
        ├── header.html       # Top navbar (injected by main.js)
        ├── sidebar.html      # Sidebar nav (injected by main.js)
        ├── footer.html       # Page footer
        └── navbar.html       # Mobile navbar
```

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Runtime      | Node.js                             |
| Framework    | Express.js v5                       |
| Sessions     | express-session (in-memory store)   |
| Templating   | Plain HTML (no template engine)     |
| Styling      | Vanilla CSS with custom properties  |
| JS           | Vanilla JS (no frontend framework)  |
| Dev tool     | nodemon (auto-reload)               |

---

## Adding Mock Questions

Edit `data/mock-questions.js`. Each question follows this shape:

```js
{
  id: 16,
  question: 'Your question text here.',
  choices: ['Option A', 'Option B', 'Option C', 'Option D'],
  answer: 'Option A',             // must match one of the choices exactly
  domain: 'Verbal Ability',       // Verbal Ability | Numerical Ability | Clerical Ability
  difficulty: 'Easy',             // Easy | Medium | Hard
}
```

Restart the server after editing — mock data is loaded at startup.

---

*Built by Team Hauers in collaboration with the CSPC ACCESS · Hauers v1.0.0*
