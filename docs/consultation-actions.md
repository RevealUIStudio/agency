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

`POST /api/stripe/webhook` accepts `checkout.session.completed` and
`charge.refunded`, `refund.created`, and `refund.updated`. After a paid session it runs `write_calendar_meet_on_pay`,
then `notify_owner_paid`, then `send_confirm_email`. The production handler
wires `notify_owner_paid` to Gmail for founder@revealui.com. It does not pass a
buyer sender. An owner-mail failure or a draft failure does not fail the
calendar write. A replay that is already scheduled does not send a second owner
notice. Signed refund events retrieve current Stripe charge, succeeded refunds, and Checkout
payment-intent evidence before reconciling private delivery; they never execute
a refund.

`GET /api/consultation/booking?booking=` returns the paid time, Google Meet link, and Stage B flag for the success page. It does not return the buyer name or email.

## Consultation deliverable and share fulfillment

`CONSULTATION_DELIVERABLE` in `app/lib/engagements.ts` owns the advertised
session scope: session notes and a recommended next step. Booking, confirmation,
the calendar invite, process copy, and the checklist consume that same scope.
Payment and scheduling confirmation does not establish that session notes or a
domain pack have been delivered. The optional domain pack retains its separate
`stage-b` purchase flag and disclosed scope.

The private material adapter lives in `server/consultation-fulfillment.ts` and
extends the existing share HTTP owner. `POST /api/share` supports explicit
owner actions. The existing `STUDIO_OWNER_SESSION` gate applies; the server's
`STUDIO_CONTENT_DEVICE_TOKEN` must resolve through maintained RevealUI auth to
an active, verified canonical platform operator. `STUDIO_CONTENT_API_URL` is an
HTTPS origin, without a path or user credentials. It is read by the existing
Consultation environment loader. This is a server credential; the buyer never
receives it. Redirects from the content API are rejected.

| Action | Input and authoritative evidence | Persisted result |
| --- | --- | --- |
| `prepare` | `bookingId`, `buyerUserId`, nonempty `notes` and `nextStep`. Calendar must hold `paid_scheduled` with event and Stripe session references; the active verified canonical buyer's email must match that record. Optional `domainPack` material requires the Calendar's Stage B entitlement, never a body purchase flag. | Private site with immutable booking/buyer binding; draft pages and an open edit session. A retry finds the existing booking site and resumes the persisted session. No delivery URL or delivery success. |
| `publish` | Same booking/buyer identity and `sessionId`; paid booking and buyer identity are rechecked. The persisted session must belong to that site and contain both session notes and the recommended next step. Domain-pack documents are checked against the server entitlement again. | Existing edit-session publish writes pages and revisions. Only verified published material receives a viewer grant for the bound buyer. Success returns the central authenticated `/client-shares/:siteId` URL. A failed publication or grant returns `delivered: false`; it never reports delivery. |
| `revoke` | Existing immutable booking/buyer binding and owner authority. Revocation can run after the Calendar event has been removed. | Buyer collaborator access is removed and site status becomes draft. Repeated revocation is safe. It does not delete delivery history or execute a refund. |
| `reconcile` | Existing immutable booking/buyer binding, owner authority, and a successful current Calendar read. A provider read failure does not establish cancellation. | Missing/cancelled or fully refunded bookings revoke the exact share. Lost or paused domain-pack entitlement unpublishes every existing domain-pack page, including pages from older edit sessions; session notes remain available. No automatic Google push subscription or instant cancellation update is claimed. |
| `resolve-domain-pack` | Booking/buyer identity, `chargeId`, and owner decision `retained` or `revoked`. Current Stripe charge and Checkout proof must match the paid Calendar booking and exact refund amount. | Persisted explicit review decision. Retained scope can be published in a subsequent reviewed session; the action does not republish material automatically. Revoked scope stays unpublished. |
| `attach-domain` | Booking/buyer identity and `hostname`; current paid Calendar, canonical buyer, immutable private binding, and purchased/retained domain-pack scope are rechecked. Only the hostname reaches the shared content owner; caller DNS or purchase proof is rejected. | The content API owns Vercel project attachment, ownership verification and DNS checks, and persisted unique hostname mapping. Pending verification returns HTTP 202, `domain-pending-verification`, `customDomainAttached: false`, and provider TXT/DNS instructions. Verified attachment returns `domain-attached` and the persisted domain. Both return `delivered: false`; neither publishes material or grants access. |
| `detach-domain` | Immutable booking/buyer binding and owner authority; cleanup remains available after cancellation or revocation. | Shared content owner removes the persisted alias and its owned provider attachment. `domain-detached` returns `customDomainAttached: false`, `domain: null`, and `delivered: false`. Notes, revisions and publication access are unchanged. |

The adapter uses RevealUI's existing sites, pages, edit sessions, revisions,
collaborators, and canonical users. It has no process-local material or client
auth store. The content owner's unique booking binding resolves racing site
creation; ambiguous drafts fail closed. Buyer retrieval uses maintained central
admin login, verification, MFA, password rotation, and publication access.
Non-demo Studio share hosts point to that authenticated viewer. Only `demo`
retains public example files and placeholder pages.

Real custom hosts use the existing share HTTP handler, Vite middleware and
[Vercel rewrite owner](https://vercel.com/docs/project-configuration/vercel-json#rewrites).
Every root or nested request looks up the current hostname through the anonymous
`GET /api/content/consultation-domain?hostname=...` boundary. The lookup returns
only a site ID for an active, published, private delivery with current buyer,
membership and domain entitlement; unavailable mappings return 404. Agency sends
no incoming cookie or operator credential. Successful lookup returns a private,
uncached 303 redirect to `https://admin.revealui.com/client-shares/:siteId`, where
normal central authentication and current content authorization apply. A DNS
observation, hostname, process pack or demo seed never establishes client access.
Written-pack publication reports attachment only from current persisted domain
and lifecycle state. Agency adds no domain-provider configuration; the shared
server owns its supported Vercel configuration and verification.

The remaining provider and fulfillment lifecycle work is tracked in the fleet
content-truth work under [agency #281](https://github.com/revealui-studio/agency/issues/281).
The affected one-off inventory and removal targets are:

| Location | Current behavior | Durable destination and removal evidence |
| --- | --- | --- |
| `server/share-seed.ts` and `server/share-http.ts` | Previously only demo files existed. | Client writing/publication now uses the maintained private content owner. Synthetic adapter tests cover draft preparation, restart reuse, paid/buyer proof, revisions, tenant boundaries, publication conflicts, failed grants, and revocation. Demo seed files remain explicit examples. Hosted integration validation is still required before live delivery. |
| `app/lib/share-stage-b.ts`, `app/components/share/CustomDomainDesk.tsx`, and `ShareDeps.packs` in `server/share-http.ts` | The removed process pack registry and caller-supplied pack/DNS observations formerly acted as ephemeral host authorization; a server fixture served demo material through a caller-labelled live alias. | `packsById`, `saveSharePack`, `listSharePacks`, `clearSharePacks`, and the server's supplied-pack resolver are removed. The desk remains an explicit example. Actual alias actions consume the shared provider-verified persisted domain lifecycle. Adapter tests cover pending/verified contracts, fresh instances, paid/buyer/binding scope, provider failure, cleanup after cancellation, and absent/revoked mappings without seed fallback. Shared owner tests establish provider evidence, unique mappings, current lifecycle and private access. |
| `app/components/share/ShareFrame.tsx` and `app/routes/share/SharePages.tsx` | Client-shaped hostnames formerly rendered example pages as workspaces. | Only the demo route renders placeholders; client hosts use a central authenticated viewer link. Hostnames do not authorize client-material reads. Shared content API, search, session, sync and cache privacy are enforced in the RevealUI owner. |

The maintained central admin operator control consumes these actions through a
server-only proxy to the configured Studio origin and existing owner secret.
Buyer sessions never receive the owner secret or operator device credential.
The founder owns fulfillment. Agency #281 retains managed provider/configuration
acceptance and hosted end-to-end validation; source tests do not establish live
provider attachment or deployed routing.
No delivery deadline or living-pack entitlement is inferred from these examples.

The owner selected private, authenticated client access on 2026-10-04.
Implementation must extend RevealUI's shared site/content access and session
primitives. Protecting only the Studio viewer is insufficient while generic
published-page reads, search, collection APIs, or shared caches can expose the
same material. A confirmed paid Calendar booking must establish the fulfillment
entitlement; a client-supplied booking reference or purchase flag cannot do so.

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

Private access follows verified provider evidence, without issuing money or
changing the meeting. A signed `charge.refunded` event retrieves current Stripe
charge state, succeeded refund records, and the Checkout Session for its PaymentIntent, then verifies the
Calendar's Stripe session binding. The Calendar ledger retains charge ID,
cumulative refunded amount, full-refund status, and domain-pack review state.
Pending, failed, and cancelled refunds never establish completed refund evidence.
This evidence is written before changing existing private material. Google
writes preserve the booking history, use the current event ETag, and send no
attendee update.

A full refund revokes the share. The owner selected partial-refund handling on
2026-10-05: keep session notes available and pause optional domain-pack material
pending review. Refund replays cannot erase an explicit scope review; a greater
cumulative refund reopens review. Publication checks the entire existing share,
so a notes-only edit cannot reactivate older domain-pack pages. Content/provider
failures return a retryable webhook failure, and retry reads the current
provider and ledger state. An already removed Calendar record also revokes its
persisted share; a missing paid record cannot authorize later publication.
The owner `reconcile` action handles confirmed Calendar cancellation/removal.
There is no new scheduler or promise of immediate Google push reconciliation.

Credentialed Google, Stripe, and content HTTP calls share a bounded transport
with a 15-second abort deadline and rejected redirects. No session timeout or
environment bypass changes normal test execution.

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

The booking registry itself requires no new secrets. Private fulfillment adds
the supported content API origin and existing operator device credential to the
server configuration; missing configuration fails closed. Merge with a merge
commit. Do not squash.
