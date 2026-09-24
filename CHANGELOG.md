# @revealui-studio/agency

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
