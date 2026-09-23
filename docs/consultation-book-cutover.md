# CUTOVER — Consultation book to pay

Merge this with a merge commit into `test`. Do not squash. Do not promote `test` to `main` from this change.

The public 30-minute intro stays on the Google Calendar Appointments link. This booker does not use that URL. Consultation is the paid 60-minute flow at `/consultation/book`.

## Routes

| Path | Role |
| --- | --- |
| `/consultation/book` | Pick a weekday slot, save a 30-minute hold, redirect to Checkout |
| `/consultation/book/success` | Payment received. Meet link arrives in the confirmation |
| `/consultation/book/cancel` | Checkout canceled. Hold expires on its own |
| `GET /api/consultation/availability` | Open 60-minute slots, Eastern Time |
| `POST /api/consultation/book` | Save the hold and create a Checkout Session |
| `POST /api/stripe/webhook` | `checkout.session.completed` creates the Calendar event and Meet |

## Owner env (Vercel, Preview and Production)

Required before a stranger can book:

- `STRIPE_SECRET_KEY` — secret key for the Studio Stripe account
- `STRIPE_WEBHOOK_SECRET` — signing secret for `POST /api/stripe/webhook`
- `GOOGLE_CALENDAR_ID` — founder calendar id (busy query and event insert)
- One of:
  - `GOOGLE_SERVICE_ACCOUNT_JSON` — service account JSON, raw or base64
  - `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY`
- `GOOGLE_CALENDAR_IMPERSONATE` — founder user to impersonate when the service account uses domain-wide delegation (needed for Meet on that calendar)

Holds across serverless instances:

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, or
- `KV_REST_API_URL` and `KV_REST_API_TOKEN`

Without that store, holds live in the function instance only. Calendar tentative events still block the slot after the hold is written.

Optional:

- `PUBLIC_SITE_URL` — origin for Checkout success and cancel URLs. Defaults to the request host.

Checkout price ids are in code (Consultation quantity = hours, Stage B only when the buyer checks the add-on).

## Stripe webhook

Dashboard endpoint: `https://<preview-or-production>/api/stripe/webhook`

Events: `checkout.session.completed`. Add `invoice.paid` only if an invoice carries `booking_id` metadata.

## Not this cutover

- Do not point Consultation calls to action at the 30-minute intro Appointments URL.
- Do not put a public Stage B credit control on `/consultation/book`. Stage B is an optional paid add-on.
- Do not send buyer mail from this deploy. The confirm template is `docs/consultation-confirm-email.md`.
- Desk Sheet has no writer here. The webhook logs `consultation_paid` to `consultation_scheduled` and stops.
