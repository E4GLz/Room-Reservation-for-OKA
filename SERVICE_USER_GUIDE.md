# Service User Guide

## 1. Role Purpose

The Service role is designed for hospitality operations, such as the tea boy or service operator.

This role supports:

- following current room service demand
- preparing for today's meetings
- updating drink request status
- managing menu availability

## 2. What Service Can Access

### Main pages

- `/service`
- `/hospitality`
- `/profile`

### Main permissions

- view active drink requests
- see request timers
- mark drinks as preparing or served
- view today's meetings for service preparation
- manage menu items, visibility, and stock status

## 3. What Service Cannot Do

- cannot manage reservations generally
- cannot manage rooms
- cannot manage users
- cannot manage system settings
- cannot access reservation reports

## 4. Daily Service Workflow

### Start of shift

1. Open `/service`
2. Review today's meetings
3. Identify rooms likely to need hospitality support

### During active service

1. Watch for new guest orders
2. Check room, order details, and request timer
3. Mark order as preparing
4. Deliver the order
5. Mark order as served

### Menu management

Use `/hospitality` when needed to:

- mark items out of stock
- hide unavailable items
- update or manage menu item setup

## 5. Guest Ordering Context

Guests typically order through a fixed QR code assigned to the room.

### What the service operator should expect

- multiple drinks can be submitted in one guest request
- guests can send reminders after waiting threshold
- reminder requests should be treated as priority follow-up

## 6. Understanding Request Status

### Main statuses

- new
- preparing
- served
- cancelled

### Timing behavior

- timer starts from request submission
- timer stops once the order is marked served
- timing helps measure real service speed

## 7. Meetings Awareness

The service role can also see today's meetings to prepare for:

- expected guest activity
- likely food service demand
- hospitality readiness by room

## 8. What Service Should Expect

- A focused operational screen, not a reservation management role
- Live updates matter more than historical reporting
- Hospitality preparation should be room-driven and meeting-aware

## 9. Best Practice For Service Users

- Keep the service screen open during operations
- Use timers to avoid late delivery
- Respond quickly to reminder flags
- Update out-of-stock items immediately so guests do not order unavailable drinks
