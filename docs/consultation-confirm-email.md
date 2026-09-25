# Consultation confirmation draft

`send_confirm_email` builds this draft after the calendar event exists. The gate is `draft_only`. Delivery is `draft`. The buyer invite is the Google Calendar event with Google Meet. This repo does not send the draft.

A draft sink failure must not roll back the calendar event. The same sentences are in `app/lib/consultation-buyer.ts`. The calendar invite uses `calendarInviteDescription`. The webhook calls the draft sink only.

Subject: `RevealUI Studio Consultation, {Eastern Time range}`

Example range: `Wed, Jan 7 · 9:00 AM–10:00 AM ET`

```
Payment received for your RevealUI Studio Consultation.

When: {Eastern Time range}
Google Meet: {meet link, or "The Google Meet link is on the calendar invite."}
Company: {company, when present}
The domain pack ($297) is on this payment.
OR
This payment is the consultation only.

Prep: send the system you want to look at and the question you want answered. A link is usually enough.
Questions: founder@revealui.com
```

Do not describe the domain pack as free, included, waived, or credited. The add-on is either on the Checkout Session or absent. A network order still uses these sentences: the pack line stays "The domain pack ($297) is on this payment." Do not add a line that the fee was removed. Do not put internal desk notes in the email draft or the calendar invite. The Stripe SKU stays stage-b.

The subject contains `RevealUI Studio`. The body says Google Meet. Do not shorten that label to Meet. Do not use an em dash (U+2014). Time ranges keep the en dash from `formatConsultationRange`.

## Studio header

This draft is plain text. The subject and the first line say RevealUI Studio. Do not mount the product `RevealUIWordmark`. Do not add a tagline, a second logo, or site nav to Studio Consultation mail.

There is no send switch on this draft. Do not send it to the buyer. `notify_owner_paid` is a separate action. It notifies founder@revealui.com only. See `docs/consultation-actions.md`.
