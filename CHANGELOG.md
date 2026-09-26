# @revealui-studio/agency

## 0.3.3

### Patch Changes

- 5403230: Read the Launch list from published `@revealui/contracts` 0.12.0 and export the Adapter add-on at $2,497.
- 743e0ce: Add the Studio blog at /blog. Blog is on Studio. Docs are product reference.
- c526c2c: Serve the transparent Circuit-R on the default favicon and Open Graph card. Keep the navy plate only on the iOS apple-touch adapter.

## 0.3.2

### Patch Changes

- 8638ac5: Book a Consultation uses the RevealUI booking calendar and form primitives.

## 0.3.1

### Patch Changes

- b058246: Consultation network book links put the domain pack on Checkout and zero that line with a Stage B coupon. Strangers keep the optional paid add-on.

## 0.3.0

### Minor Changes

- Send the Workspace impersonation subject on the calendar service-account JWT. OAuth refresh stays preferred.
- Add Consultation booking through a Stripe Checkout Session, then Calendar and Meet.
- Add Stage B share fields (custom domain and chrome level) and the $297 Consultation add-on.

### Patch Changes

- Omit payment_method_types on Consultation Checkout so dynamic methods and wallets can surface, and harden the book, success, and cancel pages for narrow viewports.
- Resolve the share-host import in the Vite build.
