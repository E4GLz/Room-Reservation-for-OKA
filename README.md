# Room Reservation Web Application

Internal room reservation system for meetings, workshops, training sessions, and offsite events. The app replaces the manual Excel-style monthly planner with a modern web interface while preserving the familiar date-by-room operational view.

## Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS
- Backend: Next.js Route Handlers
- Database: SQLite
- ORM: Prisma
- Charts: Recharts
- Auth: Local email/password sign-in with admin and staff user roles

## Features

- Excel-inspired planner with dates as rows and rooms as columns
- Monthly, weekly, daily, and list reservation views
- Create, edit, and cancel bookings
- Reliable overlap detection for confirmed bookings
- Room master management with active/inactive status
- Dashboard with utilization and booking summaries
- Reports page with trend and requester metrics
- Profile settings for name, email, phone number, and password updates
- Admin booking settings for blocked days and workweek configuration
- SMTP-based email sending for upcoming admin meeting reminders
- User administration with account creation, role assignment, and status control
- Reservation audit trail
- Real reminder email dispatch for upcoming meetings plus API notification payloads

## Pages

- `/login`
- `/dashboard`
- `/planner`
- `/my-bookings`
- `/bookings/new`
- `/bookings/[id]`
- `/rooms`
- `/reports`
- `/profile`
- `/users`
- `/settings`

## API Routes

- `POST /api/auth/login`
- `GET /api/rooms`
- `POST /api/rooms`
- `PUT /api/rooms/:id`
- `GET /api/reservations`
- `POST /api/reservations`
- `GET /api/reservations/:id`
- `PUT /api/reservations/:id`
- `POST /api/reservations/:id/cancel`
- `GET /api/reservations/conflicts`
- `GET /api/dashboard`
- `POST /api/notifications/upcoming-reminders`
- `GET /api/reports`
- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `PUT /api/profile`
- `GET /api/settings`
- `PUT /api/settings`

## Project Structure

```text
app/
  api/
  bookings/
  dashboard/
  login/
  planner/
  reports/
  rooms/
  settings/
  users/
components/
  bookings/
  dashboard/
  layout/
  login/
  planner/
  profile/
  providers/
  reports/
  rooms/
  settings/
  ui/
  users/
lib/
  auth.ts
  constants.ts
  email.ts
  prisma.ts
  reservations.ts
  settings.ts
  types.ts
  utils.ts
  validation.ts
prisma/
  schema.prisma
  seed.ts
```

## Local Setup

1. Install Node.js 20+ and npm.
2. Copy `.env.example` to `.env`.
3. Install dependencies:

```bash
npm install
```

4. Generate the Prisma client:

```bash
npx prisma generate
```

5. Create the SQLite database and apply the schema:

```bash
npx prisma db push
```

6. Reset the database to an empty state:

```bash
npm run seed
```

7. Start the app:

```bash
npm run dev
```

8. Open [http://localhost:3000](http://localhost:3000)

## Admin Onboarding

- the seed process creates an initial admin account for first-time setup
- after first sign-in, update the admin profile password immediately from `/profile`
- use `/users` to create staff accounts and keep admin access limited
- before any broader rollout, replace development-style seeded admin credentials with company-controlled credentials

## Database Reset Behavior

- running `npm run seed` clears all rooms, reservations, and audit entries
- running `npm run seed` also ensures the default admin account and application settings exist
- no sample rooms or sample reservations are added back
- the app will start with empty states until you create your own data

## Notes For Expansion

- Replace local login with server-side auth/session enforcement before production launch
- Move from SQLite to PostgreSQL for shared internal deployment
- Add true email notifications and approval workflows
- Add export to Excel/PDF if operational teams still need reports

## Role Model For Rollout

- `Admin`: full access to rooms, users, settings, booking creation, editing, cancellation, reports, and reminder sending
- `Staff` (stored internally as `STANDARD` for compatibility): planner access, personal dashboard summary, and personal booking history only
- staff users do not see rooms, reports, users, settings, or booking creation actions in the UI

## Go-Live Warning

- the current app still uses client-side session storage for sign-in state
- that is acceptable for demonstrations and internal review, but it is not sufficient to protect production data by itself
- before a true live rollout, add server-side authentication and authorization checks to API routes and pages

## Important Business Rules Implemented

- Required booking fields validated on the server
- `endTime` must be after `startTime`
- attendee count cannot exceed room capacity unless admin override is set
- conflicts are detected when reservations share the same room, date, and overlapping time range
- blocked dates configured in Booking Settings cannot be booked
- cancelled reservations are retained instead of deleted

## Environment

```env
DATABASE_URL="file:./dev.db"
SMTP_HOST="smtp.your-company.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="notifications@your-company.com"
SMTP_PASS="your-smtp-password"
SMTP_FROM="Room Reservation Platform <notifications@your-company.com>"
```

## Email Reminders

- upcoming admin meeting reminders can be configured from `/settings`
- the dashboard includes an `Admin reminder queue` card with a `Send reminder emails` action
- reminder emails are sent to all active admin user email addresses
- each reservation reminder is marked in the audit trail after sending so repeated clicks do not resend the same reminder

## Current Limitation In This Workspace

This coding environment does not currently have `node`, `npm`, or `git` installed, so dependency installation and runtime verification could not be executed here. The project files are fully scaffolded, but you will need to run the setup steps above on a local machine with Node.js available.
