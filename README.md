# Obeikan Knowledge Academy Reservation Platform

Internal reservation and operations platform for managing rooms, approvals, visitor agenda, hospitality requests, and reporting across Obeikan Knowledge Academy.

This project replaces the old Excel-based monthly reservation tracker with a live web application that keeps the familiar planner concept while adding workflow control, room administration, reporting, attachments, hospitality ordering, and email notifications.

## What The App Covers

- Room reservation planning with an Excel-style planner view
- Admin-controlled room and user management
- Staff and manager booking requests with approval routing
- Reservation editing, cancellation, and room reassignment
- Dashboard and report analytics
- Reception agenda screen for today's schedule
- Hospitality QR ordering for guests and service follow-up for the tea boy
- Email notifications and automatic reminder support
- Arabic and English interface support
- Light, dark, and system theme support

## Tech Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS
- Backend: Next.js Route Handlers
- Database: PostgreSQL
- ORM: Prisma
- Charts: Recharts
- Authentication: local email/password with signed server-side session cookies
- Email: Nodemailer / SMTP

## Main User Roles

- `Admin`
  - Full access to reservations, planner, rooms, users, settings, reports, approvals, hospitality admin, and attachments
  - Can create confirmed bookings directly
  - Can move reservations between rooms and notify the requester by email

- `Manager`
  - Can view planner
  - Can create booking requests
  - Can see their own booking history
  - Can approve or reject staff requests assigned to them

- `Staff`
  - Can view planner
  - Can create booking requests
  - Can view only their own booking history and dashboard activity
  - Cannot manage rooms, users, settings, or reports

- `Service`
  - Tea boy / hospitality operator role
  - Can view hospitality service dashboard
  - Can monitor current drink orders and today's meeting rooms
  - Can update order statuses and manage hospitality items

## Key Functional Areas

### Reservations

- Monthly, weekly, daily, and list planner views
- Conflict detection for overlapping confirmed bookings
- Capacity validation against room size
- Blocked-day enforcement from settings
- Admin direct booking flow without approval delay
- Staff booking requests routed to manager first when assigned, then to admin
- Reservation audit trail
- Reservation room move flow with reason capture and requester email notification

### Planner

- Dates as rows and rooms as columns
- Today row highlighting
- Weekend and blocked-day distinction
- Private booking masking for non-authorized users
- Finished reservations labeled automatically after end time
- Compact view optimized to show more rooms without horizontal scrolling

### Rooms

- Active and inactive room support
- Room code, name, type, capacity, location, and notes
- Inactive rooms hidden from the planner
- Room QR/service token support for hospitality ordering

### Dashboard And Reports

- Current and upcoming meetings for today and tomorrow
- Booking totals and approval metrics
- Utilization and occupied-hours analytics
- Room demand and weekday booking patterns
- Reservation type mix
- Hospitality demand insights

### Hospitality

- Menu item management with categories, modifiers, images, and stock visibility
- Guest QR ordering page for room-based hospitality requests
- Support for multi-drink submission in one guest request
- Guest order status tracking and reminder button
- Tea boy dashboard with live order timers and meeting awareness
- Admin hospitality monitoring page

### Agenda

- Public/reception-style agenda page for today's room schedule
- Intended for display on a reception or visitor-facing screen

### User And Settings Management

- User creation and approval-aware account model
- Registration page for new users
- Profile settings for name, email, password, and phone number
- Workweek and blocked-day settings
- Upcoming email reminder timing settings
- Arabic website title support in settings

## Important Routes

### Pages

- `/`
- `/login`
- `/register`
- `/dashboard`
- `/planner`
- `/my-bookings`
- `/approvals`
- `/bookings/new`
- `/bookings/[id]`
- `/rooms`
- `/reports`
- `/profile`
- `/users`
- `/settings`
- `/hospitality`
- `/service`
- `/agenda`
- `/guest-order/[token]`

### Main API Routes

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/dashboard`
- `GET /api/reports`
- `GET /api/rooms`
- `POST /api/rooms`
- `PUT /api/rooms/[id]`
- `GET /api/reservations`
- `POST /api/reservations`
- `PUT /api/reservations/[id]`
- `POST /api/reservations/[id]/cancel`
- `POST /api/reservations/[id]/move`
- `POST /api/reservations/[id]/manager-approval`
- `POST /api/reservations/[id]/admin-approval`
- `GET /api/manager-approvals`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/[id]`
- `PUT /api/profile`
- `POST /api/uploads`
- `GET /api/uploads/[id]`
- `GET /api/hospitality/*`
- `GET /api/service-orders`
- `POST /api/notifications/upcoming-reminders`

## Local Setup

1. Install Node.js 20+.
2. Create a `.env` file.
3. Install dependencies:

```bash
npm install
```

4. Generate Prisma client:

```bash
npm run generate
```

5. Push the schema to PostgreSQL:

```bash
npx prisma db push
```

6. Seed required system records:

```bash
npm run seed
```

7. Start development server:

```bash
npm run dev
```

8. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@host:5432/room_reservation"
SESSION_SECRET="replace-with-a-long-random-secret"
SMTP_HOST="smtp.your-company.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="notifications@your-company.com"
SMTP_PASS="your-smtp-password"
SMTP_FROM="Reservation Platform <notifications@your-company.com>"
ADMIN_EMAIL="admin@your-company.com"
ADMIN_PASSWORD="set-a-strong-admin-password"
CRON_SECRET="your-shared-cron-secret"
```

## Seeding Notes

- `npm run seed` is intended to initialize required platform records
- The seed process supports creating the default admin account when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are provided
- This workspace has been moved away from demo/sample room and reservation data
- Historical reservation imports should be handled intentionally through scripts or SQL, not through default seed behavior

## Email Notes

- Gmail with port `587` should use `SMTP_SECURE="false"`
- Port `465` should use `SMTP_SECURE="true"`
- Reservation room moves continue even if email sending fails, but the UI will show a warning
- Upcoming reminder emails are driven by `/api/notifications/upcoming-reminders`

## Deployment Notes

- Use PostgreSQL for any shared or production environment
- Set a strong `SESSION_SECRET`
- Validate SMTP settings before relying on notification flows
- Protect cron-triggered reminder endpoints with `CRON_SECRET`
- Keep admin credentials out of the frontend and out of committed files

## Documentation

Additional operational documentation is available in:

- [DOCUMENTATION.md](C:\Users\x3amR\OneDrive\Desktop\Codex\DOCUMENTATION.md)
- [ROLE_GUIDES.md](C:\Users\x3amR\OneDrive\Desktop\Codex\ROLE_GUIDES.md)
- [Admin User Guide](C:\Users\x3amR\OneDrive\Desktop\Codex\ADMIN_USER_GUIDE.md)
- [Manager User Guide](C:\Users\x3amR\OneDrive\Desktop\Codex\MANAGER_USER_GUIDE.md)
- [Staff User Guide](C:\Users\x3amR\OneDrive\Desktop\Codex\STAFF_USER_GUIDE.md)
- [Service User Guide](C:\Users\x3amR\OneDrive\Desktop\Codex\SERVICE_USER_GUIDE.md)
