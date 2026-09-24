# Consultation action registry

Import path: `app/lib/consultation-actions.ts`.

Buyer HTTP and a future in-process Bot use this module. Do not copy Stripe amounts, Stage B lines, or Desk status rules into a second client. This is not an Agent-Native mount. There is no `/_agent-native/actions` route and no new Stripe webhook.

Order is load-bearing. `save_slot` runs before `create_checkout_session`. Checkout without a live hold fails closed.

| Action | Gate | Preconditions | Side effects |
| --- | --- | --- | --- |
| `save_slot` | none | Slot is inside generated weekday availability. Body `waive` and `stage_b_fee` are ignored before this action. | Calendar hold, status `slot_held`, 20 minutes. |
| `create_checkout_session` | none | Prior hold exists, status is `slot_held`, and it has not expired. | Stripe Checkout Session. Lines from `consultationCheckoutLines` only. |
| `write_calendar_meet_on_pay` | none | `payment_status` is `paid`. A second call returns `already_scheduled`. | Calendar event plus Google Meet. Desk transition stays `no-desk-writer`. |
| `send_confirm_email` | `draft_only` | Booking status is `paid_scheduled`. | Confirmation draft on the `onConfirmation` sink. Channel is `calendar_meet_invite`. No outbound mail. |

`POST /api/consultation/book` runs `save_slot`, then `create_checkout_session`. If Checkout fails, the hold is released.

`POST /api/stripe/webhook` still accepts `checkout.session.completed` only. After a paid session it runs `write_calendar_meet_on_pay`, then `send_confirm_email`. A draft failure does not fail the calendar write.

## Stage B and network credit

Public Checkout treats Stage B as an optional paid add-on ($297) when the buyer checks it. The public book page has no waive control and no credit line.

Network credit is a signed `?nw=` book link plus `STRIPE_STAGE_B_NETWORK_COUPON_ID`. The coupon is applied only when a verified token sets `stage_b_fee` to `waived_network`. A missing coupon returns 503 and does not open Checkout.

## Gates that stay with the owner

- Promote `test` to `main`
- Live Stripe secrets and the webhook endpoint
- Any buyer send beyond the Calendar and Google Meet invite

No new secrets are required for the registry. Merge with a merge commit. Do not squash.
