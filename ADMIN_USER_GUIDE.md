# Admin User Guide

## 1. Role Purpose

The Admin role is the main operational control role in the platform.

Admins manage:

- room reservations
- approvals
- room setup
- user access
- platform settings
- reporting
- hospitality oversight

This role is intended for the reservation owner, facility operations lead, or designated system administrator.

## 2. What Admin Can Access

### Main pages

- `/dashboard`
- `/planner`
- `/bookings/new`
- `/bookings/[id]`
- `/rooms`
- `/reports`
- `/users`
- `/settings`
- `/hospitality`
- `/profile`

### Key responsibilities

- Create bookings directly
- Confirm or reject pending requests
- Cancel bookings
- Move a meeting from one room to another
- Manage room master data
- Manage users and roles
- Configure blocked days and workweek settings
- Review dashboard and report analytics
- Monitor hospitality demand and drink requests

## 3. Daily Admin Workflow

### Start of day

1. Open the dashboard
2. Review `Current meetings now`
3. Review `Upcoming meetings for today and tomorrow`
4. Check pending approvals
5. Check food service and hospitality demand if needed

### During the day

1. Open the planner to monitor room usage
2. Create direct bookings when requests come through admin
3. Review approval queue
4. Open booking details to edit, cancel, or move reservations
5. Download attachments for room setup or display materials when needed

### End of day or periodic review

1. Review room utilization and occupied-hours visuals
2. Review report trends and demand patterns
3. Review inactive rooms and user access when needed

## 4. Booking Management

### Create a booking

1. Open `/bookings/new` or use `Create booking`
2. Select reservation type
3. Select the room
4. Enter dates and times
5. Enter meeting title and charged details
6. Add attendees and optional notes
7. Save the booking

### What happens

- Conflict checks run automatically
- Capacity checks run automatically
- Admin-created bookings can be confirmed directly

## 5. Approval Management

Admins review requests that have reached admin level.

### Typical cases

- manager-approved staff requests
- manager-created requests
- requests that do not require manager approval

### Admin actions

- accept booking request
- reject request
- inspect booking detail and audit trail before decision

## 6. Room Reassignment

Admins can move a reservation to another room.

### Use case

- room becomes unavailable
- guest priority changes
- room quality or layout needs to be changed

### Steps

1. Open the booking detail page
2. Use `Move reservation to another room`
3. Select the new reservation type if needed
4. Select the new room
5. Enter the reason for room change
6. Submit

### Result

- System validates the new room
- Audit trail is updated
- Requester receives notification email if SMTP is configured correctly

## 7. Rooms Management

Admins manage room master data from `/rooms`.

### Supported actions

- add room
- edit room
- deactivate room

### Notes

- inactive rooms are preserved for records
- inactive rooms do not appear as active booking options in the planner flow

## 8. Users Management

Admins manage users from `/users`.

### Supported actions

- create user
- assign role
- assign manager
- activate or inactivate account

### Roles available

- Admin
- Manager
- Staff
- Service

## 9. Settings

Admins manage operational configuration from `/settings`.

### Settings include

- site title
- Arabic site title
- site description
- blocked booking days
- workweek start and end
- reminder timing settings

## 10. Hospitality Oversight

Admins can monitor hospitality from `/hospitality`.

### Admin hospitality responsibilities

- add or edit menu items
- upload item images
- manage modifiers
- mark items out of stock
- monitor current drink requests
- monitor today's meetings from service angle

## 11. Reports And Analytics

Admins use `/reports` for historical analysis.

### Main insights

- booking trends
- room demand
- occupied hours
- weekday booking pattern
- reservation type mix
- hospitality order insights

## 12. What Admin Should Expect

- Full platform visibility
- Ability to manage all booking records
- Ability to see private details and attachments
- Ability to configure system behavior

## 13. What Admin Should Be Careful About

- Avoid sharing admin credentials
- Review room moves carefully before sending requester notifications
- Confirm SMTP settings before relying on email notifications
- Keep blocked-day settings accurate
- Use inactive status instead of deleting important room records
