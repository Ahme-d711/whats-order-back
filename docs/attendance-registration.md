# Attendance registration

The NestJS process serves the RTL form from `public/` and exposes
`POST /api/attendance-registrations`. The browser sends a UUID v4
`Idempotency-Key` with every logical submission. Retrying the same request
returns the originally created row instead of inserting another one.

## Configuration

Copy `.env.example` to `.env` for local development and replace its sample
credentials. Production secrets must be supplied by the deployment platform;
do not commit `.env`.

- `DATABASE_URL` (required): PostgreSQL connection string.
- `PORT` (optional): HTTP port, default `3000`.
- `NODE_ENV` (optional): `development`, `test`, or `production`.
- `CORS_ORIGINS` (optional): comma-separated origins when a separate frontend
  calls the API. Same-origin form submissions do not require it.
- `ADMIN_API_KEY` (required in production): shared secret for admin list/delete
  and broadcast settings. Send as `X-Admin-Api-Key` or `Authorization: Bearer <key>`
  from a trusted server/BFF only — never expose this key in the browser.
- `WASEL_API_TOKEN` and `WASEL_INSTANCE_ID` (optional): WA-Pilot credentials
  for WhatsApp reminders. Saving a broadcast time still succeeds when they are
  missing; each message is then stored as failed.

## Database and startup

Use Node.js 22.22.3 or newer, as declared in `package.json`.

```bash
npm install
npm run prisma:migrate:deploy
npm run build
npm run start:prod
```

Use a database role scoped to this database. Run migrations as a deployment
step before starting new application instances. For local schema development,
use `npm run prisma:migrate:dev`.

## API request

```http
POST /api/attendance-registrations
Content-Type: application/json
Idempotency-Key: <uuid-v4>

{
  "fullName": "محمود محمد",
  "whatsOrderPhone": "201012345678",
  "activity": "مطعم",
  "address": "القاهرة، مدينة نصر، شارع الطيران"
}
```

Success returns HTTP 201 with `{ "success": true, "data": ... }`. Validation
errors return HTTP 400 in the shared error envelope. Duplicate phone numbers
return HTTP 409 (`This phone number is already registered for attendance`).
Unexpected server errors are logged internally and return a sanitized HTTP 500
response. `whats_order_phone` is unique; retrying the same `Idempotency-Key`
still returns the original row.

## Admin API

Admin endpoints are protected by `ADMIN_API_KEY` (`X-Admin-Api-Key` or
`Authorization: Bearer <key>`). They must be called from a trusted server/BFF
only.

### List

```http
GET /api/admin/attendance-registrations?page=0&size=10&search=محمود
X-Admin-Api-Key: <admin-api-key>
```

Query params:

- `page` (default `0`): zero-based page index
- `size` (default `10`, max `100`): page size
- `search` (optional): matches full name, phone, activity, or address

Success returns HTTP 200:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "...",
        "fullName": "...",
        "whatsOrderPhone": "...",
        "activity": "...",
        "address": "...",
        "createdAt": "..."
      }
    ],
    "total": 1,
    "page": 0,
    "size": 10,
    "totalPages": 1
  }
}
```

Results are ordered newest-first (`createdAt` descending).

### Delete

```http
DELETE /api/admin/attendance-registrations/<uuid>
X-Admin-Api-Key: <admin-api-key>
```

Success returns HTTP 200 with `{ "success": true, "data": { "id": "<uuid>" } }`.
Missing IDs return HTTP 404. Invalid UUID path params return HTTP 400.
Unauthorized requests return HTTP 401.

### Broadcast time and meeting link

```http
GET /api/admin/attendance-broadcast
PUT /api/admin/attendance-broadcast
{"startsAtLocal":"2026-09-28T11:00"}

PUT /api/admin/attendance-meeting-url
{"meetingUrl":"https://example.com/live"}
```

`startsAtLocal` is the broadcast start in `Africa/Cairo`, with hour and minute.
The first save notifies current registrations with the confirmation message.
A later change notifies them with the update message and reschedules the
24-hour, 1-hour, and start reminders. `meetingUrl` is stored separately, does
not send a message, and is included only in reminders that have not been sent
yet. Send `null` or `""` to clear it. The link must be `http` or `https`.
