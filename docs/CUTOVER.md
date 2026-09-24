# Consultation book, pay, calendar

Buyer path on Preview and test:

1. `/consultation/book` lists weekday 60-minute slots, 09:00–17:00 America/New_York.
2. Save creates a 20-minute hold and a Stripe Checkout Session.
3. `checkout.session.completed` writes a founder-calendar event with Google Meet.
4. The public Google Appointments URL (`INTRO_CALL_URL` in `app/lib/site.ts`) stays the free 30-minute intro only. It is not the Consultation booking path.

## Env

Set these on the Preview project. Do not commit them.

- `STRIPE_SECRET_KEY` — create the Checkout Session
- `STRIPE_WEBHOOK_SECRET` — verify `POST /api/stripe/webhook`
- `STRIPE_CONSULTATION_PRICE_ID` — optional. Default is the live Consultation price, $300 per hour, quantity = hours
- `STRIPE_STAGE_B_PRICE_ID` — optional. Default is the live Stage B price, $297, only when the buyer checks the add-on
- `PUBLIC_SITE_URL` — absolute origin for Checkout success and cancel URLs
- `GOOGLE_CALENDAR_ID` — founder calendar id
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN` — preferred. Meet creation on a consumer calendar needs this
- `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` — service-account fallback when the refresh token is unset. The value is PKCS#8 material; escaped newlines are accepted
- `GOOGLE_IMPERSONATE_SUBJECT` — optional Workspace user for domain-wide delegation. Studio sets `founder@revealui.com`. The service-account JWT includes `sub` only when this is non-empty. It is never copied from `GOOGLE_CALENDAR_ID`. The OAuth trio still wins when all three OAuth vars are set
- `RESEND_API_KEY` and `RESEND_FROM` — optional. When both are set, the webhook sends the confirmation email. When either is missing, the calendar event still lands. Template: `docs/consultation-confirm-email.md`

Webhook event: `checkout.session.completed`.
Endpoint: `POST /api/stripe/webhook`.

## Domain-wide delegation

One-time Workspace Admin step. After it propagates, an external calendar share is not required.

1. Admin → Security → Access and data control → API controls → Domain-wide delegation.
2. Add or edit the client for the service account OAuth 2 Client ID in GCP. The account is `revealui-email@gen-lang-client-0097496289.iam.gserviceaccount.com`.
3. Scope: `https://www.googleapis.com/auth/calendar`
4. Save. Wait a few minutes.
5. Set `GOOGLE_IMPERSONATE_SUBJECT=founder@revealui.com` on the agency Preview and Production targets, then redeploy Preview.

`unauthorized_client` means that client id or scope is not authorized in Admin. Do not invent an OAuth client to get past it.

## Owner gates

Vercel secrets, the Stripe webhook endpoint, promote, and outbound email are not part of this change.

Network credits stay on the invoice endpoint. The public book page has no credit control.
