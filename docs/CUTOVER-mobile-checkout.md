# CUTOVER — mobile Consultation Checkout

Strangers pay on Stripe Checkout. The hosted invoice page is Stripe-owned. Do not CSS-fix `invoice.stripe.com`.

Book → pay order stays: slot hold → Checkout Session → existing webhook → Calendar + Meet.

## Not in this change

- No new Stripe webhook. `POST /api/stripe/webhook` and `checkout.session.completed` stay as they are.
- No promote to production unless Joshua says so.
- Kayla HOLD SEND is unchanged. Network waive stays on the hosted-invoice / server credit path.
- No public “waived” or “free domain” copy. Online bookers see optional Stage B, default off.
- No Stripe price, DNS, or catalog work. Price IDs stay `STRIPE_CONSULTATION_PRICE_ID` and `STRIPE_STAGE_B_PRICE_ID` (defaults already in `app/lib/consultation-checkout.ts`).
- `automatic_tax` stays off.
- Do not switch Checkout to embedded or custom. `ui_mode` is omitted so hosted Checkout remains the default.

## Dashboard (Owner)

On the Studio Stripe account:

1. Enable Apple Pay, Google Pay, and Link. Dynamic payment methods are on because Session create omits `payment_method_types`.
2. Register Apple Pay domains for the Preview host and the production host (`revealuistudio.com` and the Preview alias in use).
3. `integration_identifier` (`consultation_book_` plus 8 letters) needs Checkout Sessions on API version `2026-03-25.dahlia` or newer. This PR does not pin `Stripe-Version` and does not upgrade the webhook endpoint. If Session create returns `stripe-checkout:400` for an unknown `integration_identifier`, upgrade the account API version in Workbench before blaming the book page. Dahlia also renames `ui_mode` values; do not send `ui_mode=hosted` after that upgrade.

## After merge to test

Owner/Bot promote when Joshua says. Until then, Preview is the smoke target.

## Bot smoke (~390px)

1. Open `/consultation/book` at about 390px width. The studio chrome should not scroll sideways. The pay button is full width. Fields are full width. Stage B starts unchecked. Copy does not say waived or free domain.
2. Hold a slot and land on the Checkout URL. Screenshot the studio page and the Checkout landing. Do not restyle Checkout.
3. Expire that Checkout Session. No live charge.
4. Hit cancel and confirm `/consultation/book/cancel` returns to the book page from a full-width control.
5. Leave Sentry and other issues alone. This cutover does not resolve them.

## Handoff

Bot box path (not required in CI): `/workspace/handoffs/mobile-checkout-2026-09-23/`
