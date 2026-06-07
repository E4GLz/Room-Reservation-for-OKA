# Reservation Platform Documentation

## 1. Purpose

The Obeikan Knowledge Academy Reservation Platform is a live internal operations system used to manage:

- room reservations
- approvals
- room master data
- visitor agenda display
- hospitality ordering
- user administration
- reporting and analytics

It replaces the earlier manual Excel tracker and email-based coordination process.

## 2. High-Level Modules

### Reservation Management

- Planner-based room schedule
- Booking creation and request submission
- Booking edit, cancellation, and room reassignment
- Conflict detection and capacity checks

### Approval Workflow

- Staff requests can move to assigned manager first
- After manager approval, requests move to admin
- Admin can confirm or reject
- Admin-created bookings can be confirmed directly

### Room Administration

- Add, edit, activate, and deactivate rooms
- Hide inactive rooms from planner usage
- Preserve inactive rooms for records and history

### Dashboard And Reports

- Real-time operational view for admins
- Personal summary view for staff and managers
- Historical reservation analytics
- Occupied-hours reporting

### Hospitality

- Guest QR-based drink ordering
- Tea boy service dashboard
- Admin hospitality monitoring
- Menu item and modifier management

### Agenda Display

- Today-only public schedule screen for reception/visitor display

## 3. User Roles

### Admin

- Full control of reservations, rooms, settings, users, reports, and hospitality admin
- Can create immediate confirmed bookings
- Can move reservations to another room and notify requester by email
- Can review requests that reach admin level

### Manager

- Can create requests
- Can review and approve/reject staff requests when assigned as manager
- Can view own booking history and planner

### Staff

- Can create requests
- Can view planner and personal booking history
- Cannot see other users' booking details
- Cannot access admin-only pages

### Service

- Intended for tea boy / hospitality operator
- Can see hospitality service screen
- Can manage order states and follow current room activity

## 4. Reservation Lifecycle

### Admin-created booking

1. Admin creates reservation
2. Validation checks run
3. Reservation is saved as confirmed unless cancelled
4. Booking appears in planner and analytics

### Staff-created request with manager

1. Staff submits request
2. Request is saved as pending
3. Manager reviews
4. If approved, request moves to admin
5. Admin confirms or rejects

### Manager-created request

1. Manager submits request
2. Request moves directly to admin review

### Cancellation

- Cancellation does not hard delete the reservation
- Reservation stays in the database with cancelled status
- Audit entries remain available

### Room reassignment

1. Admin opens booking detail
2. Admin selects target reservation type
3. Admin selects target room
4. Admin enters reason
5. System validates conflict/capacity rules
6. Reservation is moved
7. Requester receives email notification if SMTP succeeds

## 5. Planner Behavior

The planner is the main operational scheduling view.

### Supported views

- monthly
- weekly
- daily
- list

### Behavior

- rows represent dates
- columns represent rooms
- today is highlighted
- weekends and blocked days are visually distinct
- finished reservations are labeled automatically
- multiple reservations in one room/day stack in the same cell
- non-authorized users see blocked/private entries instead of details

### Filters

- room
- reservation/event type
- status
- search

## 6. Reservation Validation Rules

The backend enforces the main rules.

### Required checks

- room must exist and be active
- attendee count must fit room capacity unless override is enabled
- end time must be after start time
- blocked days cannot be booked
- confirmed reservations cannot overlap in same room/date/time range

### Conflict rule

Two reservations conflict when:

- same room
- overlapping date range
- overlapping time range
- existing reservation is confirmed

## 7. Hospitality Flow

### Admin hospitality page

- manage menu items
- manage modifiers
- upload drink images
- mark items out of stock or hidden
- monitor today's meetings
- monitor current drink requests

### Guest flow

1. Guest scans fixed room QR code
2. Guest opens room hospitality page
3. Guest submits one or more drink requests
4. Guest sees simplified order-status page
5. After 15 minutes, guest can send reminder

### Tea boy flow

1. Tea boy opens service dashboard
2. Sees current requests with room and timer
3. Marks request as preparing or served
4. Can view today's meetings for preparation

### Service timing

- `submittedAt` captures request time
- `preparingAt` captures when preparation starts
- `servedAt` captures delivery time
- request timers can be used to measure delivery performance

## 8. Dashboard

### Admin dashboard focus

- current meetings now
- upcoming meetings for today and tomorrow
- operational snapshot
- approval and booking KPIs
- occupied-hours and trend analytics
- food service and hospitality visuals

### Staff/manager dashboard focus

- personal booking totals
- pending requests
- upcoming personal bookings
- quick navigation

## 9. Reports

Reports focus on historical operational analytics, including:

- booking trend
- occupied hours
- room demand
- weekday booking pattern
- reservation type mix
- top requested companies
- hospitality order trends

## 10. Attachments

Reservation-related uploads are stored in the database and accessed through protected routes.

Supported usage includes:

- guest company logo / meeting title logo
- materials to display on room screens

Admin can download attachments from booking detail pages.

## 11. Settings

Settings currently control:

- site title
- Arabic site title
- site description
- workweek start day
- workweek end day
- blocked booking days
- admin reminder lead time

## 12. Email Notifications

### Current email-related flows

- upcoming admin reminders
- room reassignment notification to requester

### Important SMTP note

If using Gmail:

- port `587` -> `SMTP_SECURE=false`
- port `465` -> `SMTP_SECURE=true`

If SMTP fails, booking operations may still succeed while showing an email warning.

## 13. Data Notes

The system currently supports:

- imported historical reservation data
- active/inactive room records
- preserved cancelled records
- preserved audit trail

The seed process should not be treated as the source of operational history.

## 14. Deployment Guidance

### Recommended minimum production setup

- Next.js app deployment
- PostgreSQL database
- SMTP account for system email
- secure `SESSION_SECRET`
- protected cron secret for reminder route

### Security guidance

- never expose admin credentials in frontend text
- do not commit real secrets to source control
- keep user roles restricted server-side, not only in UI
- validate all admin-only APIs with role checks

## 15. Suggested Admin Operating Practice

### Daily

- review current meetings now
- review upcoming meetings for today and tomorrow
- review pending approvals
- check hospitality demand and current orders

### Weekly

- review occupied-hours and room-demand analytics
- review blocked days and workweek configuration if needed
- review inactive rooms and user access

### Monthly

- review booking trend
- review reservation type mix
- review hospitality demand patterns
- review top-requested companies and recurring bottlenecks

## 16. Root Files Of Interest

- [README.md](C:\Users\x3amR\OneDrive\Desktop\Codex\README.md)
- [DOCUMENTATION.md](C:\Users\x3amR\OneDrive\Desktop\Codex\DOCUMENTATION.md)
- [ROLE_GUIDES.md](C:\Users\x3amR\OneDrive\Desktop\Codex\ROLE_GUIDES.md)
- [ADMIN_USER_GUIDE.md](C:\Users\x3amR\OneDrive\Desktop\Codex\ADMIN_USER_GUIDE.md)
- [MANAGER_USER_GUIDE.md](C:\Users\x3amR\OneDrive\Desktop\Codex\MANAGER_USER_GUIDE.md)
- [STAFF_USER_GUIDE.md](C:\Users\x3amR\OneDrive\Desktop\Codex\STAFF_USER_GUIDE.md)
- [SERVICE_USER_GUIDE.md](C:\Users\x3amR\OneDrive\Desktop\Codex\SERVICE_USER_GUIDE.md)
- [package.json](C:\Users\x3amR\OneDrive\Desktop\Codex\package.json)
- [prisma/schema.prisma](C:\Users\x3amR\OneDrive\Desktop\Codex\prisma\schema.prisma)
- [vercel.json](C:\Users\x3amR\OneDrive\Desktop\Codex\vercel.json)
