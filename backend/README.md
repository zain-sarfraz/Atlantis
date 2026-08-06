# Backend — Lodgify Webhook Setup

Quick steps to receive Lodgify webhooks locally (and in production).

1. Start the backend (default port `3001`):

```bash
# from the backend folder
npm install
npm run dev
```

2. Expose your local server with ngrok (or use a deployed URL):

```bash
# start ngrok and forward port 3001 (this runs continuously)
npx ngrok http 3001
```

3. In Lodgify Dashboard → Settings → Webhooks (or Integrations):
   - URL: `<ngrok-url>/api/webhooks/lodgify` (example: `https://xxxx.ngrok-free.app/api/webhooks/lodgify`)
   - Secret: choose a secret string (HMAC key).

4. Set the same secret locally (or in production env):

Add to `backend/.env` or your hosting env variables:

```
LODGIFY_WEBHOOK_SECRET="your_secret_here"
```

Notes

- The server route is `POST /api/webhooks/lodgify`.
- The middleware verifies header `ms-signature` using HMAC SHA-256 of the raw body.
- Multiple comma-separated secrets are supported.
- Bookings are saved into the `lodgifyBooking` table and then upserted into the dashboard Booking when possible.

Quick test (send a sample payload):

```bash
curl -X POST https://<ngrok-url>/api/webhooks/lodgify \
  -H "Content-Type: application/json" \
  -d '{"action":"booking_new_status_booked","booking":{"id":123,"date_arrival":"2026-08-10","date_departure":"2026-08-12"},"guest":{"name":"Test Guest","email":"test@example.com"}}'
```
