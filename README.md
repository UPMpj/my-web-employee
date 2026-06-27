# CCMS — Company / Employee Management System

A full-stack web app for managing employees, companies, dormitory buildings/rooms, ID cards,
and document approval workflows across multiple companies. Built for bilingual use (Lao/English).

## Tech Stack

**Backend** — `backend/`
- Node.js + Express + TypeScript
- PostgreSQL (Supabase), via `pg`
- Auth: JWT in an httpOnly cookie, bcrypt password hashing, optional TOTP 2FA (`otplib`)
- File storage: Cloudinary (employee photos, ID cards, backups)
- Security: helmet, rate limiting on auth routes, DB-backed token revocation, magic-byte file validation
- Email: nodemailer (password reset, approval notifications)
- Excel import/export: SheetJS (`xlsx`)
- Tests: Jest + ts-jest + Supertest

**Frontend** — `frontend/`
- React 18 + Vite
- React Router v7
- Axios (cookie-based auth, no token in localStorage)
- Recharts (dashboard charts), jsPDF / html2canvas (PDF export, ID card printing)
- Tests: Vitest + Testing Library

**Deployment** — Render (see `render.yaml`)
- Backend: web service, auto-runs DB migrations on boot
- Frontend: static site, built with Vite, SPA rewrite to `index.html`

## Project Structure

```
backend/
  src/
    routes/        one file per API resource (employees, company, import, ...)
    middleware/     auth (JWT/cookie verification), role (allow-list guard)
    utils/          audit log, backups, import parsing, file validation, ...
    __tests__/      Jest unit tests
    db.ts           PostgreSQL pool + Supabase CA pinning
    server.ts       app bootstrap, schema migrations, route mounting
  supabase-ca.pem   pinned root CA for verified DB TLS connections

frontend/
  src/
    pages/          one file per route; pages/main/ holds the post-login app
    pages/main/tabs/  EmployeeDetail sub-tabs (Basic Info, Profile, Documents, Permits)
    layout/         Sidebar, Topbar
    context/        CompanyContext, LanguageContext (Lao/English)
    hooks/          useCurrentUser, useLogoUpload
    utils/          api client, CSV/report/print helpers
    components/     shared modals and widgets
    test/           Vitest test files
```

## Getting Started

### Prerequisites
- Node.js 18+ (developed against v22)
- A PostgreSQL database (Supabase recommended) or local Postgres
- A Cloudinary account (photo/file storage)
- A Gmail account with an [App Password](https://myaccount.google.com/apppasswords) (password reset emails) — optional in dev

### 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, CLOUDINARY_*, MAIL_*
npm run dev             # http://localhost:5001
```

`JWT_SECRET` — generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Schema migrations (`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN IF NOT EXISTS`) run
automatically on server boot — no separate migration step needed.

### 2. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:5001
npm run dev             # http://localhost:5173
```

### 3. Log in

The first user must be inserted directly into the `users`/`role` tables (there's no public
sign-up — accounts are created by a Super Admin from **Settings → Users**). Roles: `Super Admin`,
`Company Admin`.

## Available Scripts

| Location | Command | Purpose |
|---|---|---|
| `backend/` | `npm run dev` | Dev server with auto-reload (kills anything already on :5001 first) |
| `backend/` | `npm run build` | Compile TypeScript to `dist/` |
| `backend/` | `npm start` | Run the compiled build (`dist/server.js`) |
| `backend/` | `npm test` | Run Jest unit tests |
| `frontend/` | `npm run dev` | Vite dev server |
| `frontend/` | `npm run build` | Production build to `dist/` |
| `frontend/` | `npm test` | Run Vitest tests once |
| `frontend/` | `npm run test:watch` | Vitest in watch mode |

## Core Features

- **Employees**: CRUD, photo upload, soft delete, CSV/Excel/PDF export, bulk Excel import with
  column-mapping and a preview/approve step
- **Approval workflow**: Company Admin edits/deletes route through `approval_requests` for a
  Super Admin to approve or reject; Super Admin edits apply immediately
- **ID cards & card requests**: issue, print (single and batch), return on resignation, a
  multi-step request/approval flow with a billing report grouped by company
- **Buildings & rooms**: floor/room layout, occupancy status, dormitory + office assignment
- **Reports**: employee and building reports with column selection, branded letterhead PDF export
- **Auth & security**: JWT in an httpOnly cookie (never exposed to JS), optional TOTP 2FA with
  backup codes, rate-limited login/password-reset, DB-backed logout/token revocation
- **Audit log**: every login/logout and data change is recorded; Super Admin can browse/filter it
- **Automated backups**: scheduled DB + photo backups to Cloudinary, with a restore flow
  (type-to-confirm, takes a safety snapshot first)
- **Bilingual UI**: Lao/English toggle, in-app user manual under Settings

## Security Notes

- The DB connection validates Supabase's TLS certificate against a pinned root CA
  (`backend/supabase-ca.pem`) rather than skipping verification.
- All employee/company data endpoints check the requesting user's company access — a
  Company Admin can never read or write another company's data.
- Uploaded files are validated by magic bytes, not just the browser-supplied MIME type.
- See `backend/.env.example` / `frontend/.env.example` for every secret the app needs; never
  commit a filled-in `.env`.

## Deployment

`render.yaml` defines two Render services: the backend web service (Node) and the frontend
static site. Set the secret env vars (`JWT_SECRET`, `DATABASE_URL`, `CLOUDINARY_*`, `MAIL_*`,
`FRONTEND_URL`) directly in the Render dashboard — they're marked `sync: false` and are not
stored in this repo.
