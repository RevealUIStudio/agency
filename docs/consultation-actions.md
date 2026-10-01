# Consultation action registry

Import path: `app/lib/consultation-actions.ts`.

Buyer HTTP and a future in-process Bot use this module. Do not copy Stripe amounts, Stage B lines, or Desk status rules into a second client. This is not an Agent-Native mount. There is no `/_agent-native/actions` route and no new Stripe webhook.

Order is load-bearing. `save_slot` runs before `create_checkout_session`. Checkout without a live hold fails closed.

| Action | Gate | Preconditions | Side effects |
| --- | --- | --- | --- |
| `save_slot` | none | Slot is inside generated weekday availability. Body `waive` and `stage_b_fee` are ignored before this action. | Calendar hold, status `slot_held`, 20 minutes. |
| `create_checkout_session` | none | Prior hold exists, status is `slot_held`, and it has not expired. | Stripe Checkout Session. Lines from `consultationCheckoutLines` only. |
| `write_calendar_meet_on_pay` | none | `payment_status` is `paid`. A second call returns `already_scheduled`. | Calendar event plus Google Meet. Desk transition stays `no-desk-writer`. |
| `notify_owner_paid` | none | Booking status is `paid_scheduled`. A second delivery does not send again. | Email to founder@revealui.com with buyer name, buyer email, Eastern Time, amount, Google Meet link, booking id, Stage B, and network. Does not mail the buyer. Desk writer stays a stub. |
| `send_confirm_email` | `draft_only` | Booking status is `paid_scheduled`. | Confirmation draft on the `onConfirmation` sink. Channel is `calendar_meet_invite`. No outbound buyer mail. |
| `assess_booking_change` | `draft_only` | Owner checks the inbox notice, previous short-notice reschedules, and domain-pack delivery. Booking is `paid_scheduled`. | Policy assessment only. No refund, calendar change, or buyer message. |

`POST /api/consultation/book` runs `save_slot`, then `create_checkout_session`. If Checkout fails, the hold is released.

A signed network Consultation link is single-use per `jti`. The book path keeps that ledger in the same calendar store as slot holds. See "Network link single use" below.

`POST /api/stripe/webhook` still accepts `checkout.session.completed` only. After a paid session it runs `write_calendar_meet_on_pay`, then `notify_owner_paid`, then `send_confirm_email`. The production handler wires `notify_owner_paid` to Gmail for founder@revealui.com. It does not pass a buyer sender. An owner-mail failure or a draft failure does not fail the calendar write. A replay that is already scheduled does not send a second owner notice.

`GET /api/consultation/booking?booking=` returns the paid time, Google Meet link, and Stage B flag for the success page. It does not return the buyer name or email.

## Cancellation and rescheduling fulfillment

The published policy uses email requests. The founder owns fulfillment in the
existing Stripe and Google Calendar accounts; no automatic refund or new buyer
portal is promised. Notice is measured from receipt in the Studio inbox, not
from when the founder reads or processes it.

`POST /api/consultation/booking` uses the existing owner session to assess a
request. It requires the booking reference, `noticeReceivedAt`, an inbox
`noticeReference`, `historyVerified: true`, `cancelledBy` (`buyer` or `studio`),
`lateReschedulesUsed`, and `domainPackDelivery` (`not_purchased`, `undelivered`,
`delivered`, or `unknown`). The owner must check those facts against the email
thread and the scope agreed before work. The endpoint returns `status:
assessment` and `fulfilled: false`; it does not claim money moved or a meeting
changed. It never uses a guest-provided timestamp to authorize a refund.

The booking primitive assesses the approved rules:

- At least 24 hours before the start, including exactly 24 hours: full refund
  of Consultation time or free reschedule.
- Under 24 hours, before the start: one free short-notice reschedule. Count a
  completed short-notice reschedule in the booking's existing email thread.
  A repeated request does not reset that history.
- At or after the start: no automatic no-show refund. Exceptional outcomes
  require owner review rather than an invented entitlement.
- Studio cancellation: full refund of Consultation time or new date.
- Paid, undelivered domain-pack work: refundable. Delivered work follows its
  disclosed scope; unknown delivery needs review. A waived pack has no paid
  fee to refund.

For an eligible refund, verify the matching Checkout payment and previous
refunds in Stripe, refund the Consultation time and eligible undelivered work,
and retain the provider refund receipt in the booking's email thread. For a
reschedule, agree an available date with the buyer and update the existing
Calendar event and invite. Record the completed change and any short-notice
reschedule use in the same thread before assessing a later request. The original
payment, inbox receipt, event, and provider receipt remain the evidence; the
assessment alone never establishes fulfillment.

## Stage B and network credit

Public Checkout treats Stage B as an optional paid add-on ($297) when the buyer checks it. The public book page has no waive control and no credit line.

Network credit is a signed `?nw=` book link plus `STRIPE_STAGE_B_NETWORK_COUPON_ID`. The coupon is applied only when a verified token sets `stage_b_fee` to `waived_network`. A missing coupon returns 503 and does not open Checkout.

## Network link single use

The token stays HMAC-signed, email-bound when an email was set, and expiring (at most 14 days). The book path also records a redemption row keyed by `jti` in the calendar store. No new external service.

Rule:

1. Signature, expiry, and email binding are checked before the ledger. An expired token or an email mismatch never creates a row.
2. The server inserts the `jti` if it is absent before it creates Checkout. That insert is the atomic claim. A second insert does not open another Checkout Session.
3. The durable claim is written only when Checkout Session creation succeeds. The row stores the `jti`, the buyer email, the Checkout Session id, the checkout URL, the booking id, when that session stops counting as open, and `expires_at` copied from the token.
4. While that session is open, the same `jti` and the same email receive the same checkout URL again. A Checkout Session counts as open for 24 hours after creation, or until the token expires, whichever is sooner.
5. A second redemption returns HTTP 409 `network-redeemed` and the message "This network Consultation link has already been used." That covers a different email, a paid claim, a second Checkout Session, and a session that is no longer open. The claim still blocks a new session until the token expiry.
6. If Checkout creation fails before a session exists, the reservation is released and the buyer can retry. A reservation with no session also lapses after two minutes so a crashed attempt does not stick.
7. The claim expires with the token TTL. After that, verification rejects the token.

Payment marks the row paid. Owner-only mint, guest rejection, and the domain pack coupon path are unchanged. The calendar event that stores the row uses a fixed carrier time so it does not occupy a Consultation slot and does not create a Google Meet link.

## Gates that stay with the owner

- Promote `test` to `main`
- Live Stripe secrets and the webhook endpoint
- Any buyer send beyond the Calendar and Google Meet invite

No new secrets are required for the registry. Merge with a merge commit. Do not squash.
