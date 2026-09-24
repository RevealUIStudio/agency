# Consultation book, pay, calendar

Buyer path on Preview and test:

1. `/consultation/book` lists weekday slots, 09:00–17:00 America/New_York, in 1-hour steps. A booking is 1 to 8 contiguous hours and must end by 17:00.
2. Save creates a 20-minute hold and a Stripe Checkout Session.
3. `checkout.session.completed` writes a founder-calendar event with Google Meet.
4. The public Google Appointments URL (`INTRO_CALL_URL` in `app/lib/site.ts`) stays the free 30-minute intro only. It is not the Consultation booking path.

## Env

Set these on the Preview project. Do not commit them.

- `STRIPE_SECRET_KEY` — create the Checkout Session
- `STRIPE_WEBHOOK_SECRET` — verify `POST /api/stripe/webhook`
- `STRIPE_CONSULTATION_PRICE_ID` — optional. Default is the live Consultation price, $300 per hour, quantity = hours
- `STRIPE_STAGE_B_PRICE_ID` — optional. Default is the live domain pack price, $297, only when the buyer checks the add-on. The buyer name is Domain pack. The SKU id stays stage-b.
- `PUBLIC_SITE_URL` — absolute origin for Checkout success and cancel URLs
- `GOOGLE_CALENDAR_ID` — founder calendar id
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN` — preferred. Meet creation on a consumer calendar needs this
- `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` — service-account fallback when the refresh token is unset. The value is PKCS#8 material; escaped newlines are accepted
- `GOOGLE_IMPERSONATE_SUBJECT` — optional Workspace user for domain-wide delegation. Studio sets `founder@revealui.com`. The service-account JWT includes `sub` only when this is non-empty. It is never copied from `GOOGLE_CALENDAR_ID`. The OAuth trio still wins when all three OAuth vars are set
- `RESEND_API_KEY` and `RESEND_FROM` — optional. When both are set, the webhook sends the confirmation email. When either is missing, the calendar event still lands. Template: `docs/consultation-confirm-email.md`
- `STUDIO_OWNER_SESSION` — bearer token for `POST /api/consultation/network-link`. The same owner session the share routes use. A missing or wrong token is a guest and cannot mint a link
- `CONSULTATION_NETWORK_WAIVE_SECRET` — HMAC secret for signed `?nw=` book links. Preview and Production. Do not print it
- `STRIPE_STAGE_B_NETWORK_COUPON_ID` — coupon id applied only when a verified network token sets `stage_b_fee=waived_network`. If this is unset, that path returns 503 and does not create a Checkout Session

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

The public book page has no credit control. Strangers still see an optional domain pack, default off. Network deals use a signed book link. The hosted invoice endpoint stays a separate owner path.

## Network waive at Checkout

After the network-waive PR is on `test` and CI is green. This change does not create the coupon, seed secrets, or promote.

| # | Step | Lane | Notes |
|---|------|------|-------|
| 1 | Confirm the PR on `test` is green | Bot | Agency network-waive PR |
| 2 | Create the live Stripe Coupon | Bot (Stripe connector) | `id=stage_b_network_credit` (or paste the RESULT id) · `percent_off=100` · `duration=once` · `applies_to` the product that owns the live Stage B price (`price_1UIjpPJz64n6uEibxJOYKJ3t`, or `STRIPE_STAGE_B_PRICE_ID` when that env is set). Look the product up from that Price in the Stripe Dashboard or API. Do not paste a product id into this repo. Name **Network credit** (Checkout-facing) · metadata `studio_offer_lock=2026-09-22`, `purpose=stage_b_network` |
| 3 | Set env on Preview and Production | Bot / RevVault | `STRIPE_STAGE_B_NETWORK_COUPON_ID=<id>` · `CONSULTATION_NETWORK_WAIVE_SECRET=<random 32+ bytes>` — never print the secret in chat |
| 4 | Redeploy Preview (git-test) | Bot | Vercel revealui-agency |
| 5 | Mint one test link | Owner or Bot with the secret | `POST /api/consultation/network-link` with the owner session, or `pnpm consultation:mint-network-link` |
| 6 | Smoke (no charge / expire the Session) | Bot | Open the signed URL. The pack is forced on. Continue. Checkout shows Consultation + Stage B + Network credit. Total is $300. Expire the Session |
| 7 | Claim drift | Bot | Book UI and buyer strings: no waive, waived, or free Stage B |
| 8 | Promote `test` to `main` | Owner | Explicit go only |
| 9 | Prod smoke, then mint the buyer link | Owner | After promote. Send only a signed URL |

`pnpm consultation:mint-network-link` reads `CONSULTATION_NETWORK_WAIVE_SECRET` and `PUBLIC_SITE_URL`. Optional flags: `--email`, `--hours`, `--ttl-hours` (default 72, max 336). It prints `{ url, expires_at }` and does not print the secret.

The coupon's product restriction is Stripe-side. Resolve the product from the live Stage B price (`price_1UIjpPJz64n6uEibxJOYKJ3t`, or `STRIPE_STAGE_B_PRICE_ID` when set), then set `applies_to` to that product. Application code only reads `STRIPE_STAGE_B_NETWORK_COUPON_ID` and sends the Stage B price id.

### Refuse

- Public waive toggle or marketing copy
- A silent $0 Stage B catalog Price
- Auto-promote or an automatic buyer email
- Reusing smoke coupons (`MURPA9ra`, `2SQzIIr5`) for live buyers
- Creating the live coupon or seeding the secret inside the application PR
