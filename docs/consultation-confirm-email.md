# Consultation confirmation email

Sent after the calendar event exists, when `RESEND_API_KEY` and `RESEND_FROM` are both set. A send failure must not roll back the calendar event. The same sentences are in `app/lib/consultation-buyer.ts`, which the webhook and the calendar invite use.

Subject: `RevealUI Studio Consultation, {Eastern Time range}`

Example range: `Wed, Jan 7 · 9:00 AM–10:00 AM ET`

```
Payment received for your RevealUI Studio Consultation.

When: {Eastern Time range}
Meet: {meet link, or "The Meet link is on the calendar invite."}
Company: {company, when present}
The domain pack ($297) is on this payment.
OR
This payment is the consultation only.

Prep: send the system you want to look at and the question you want answered. A link is usually enough.
Questions: founder@revealui.com
```

Do not describe the domain pack as free, included, waived, or credited. The add-on is either on the Checkout Session or absent. A network order still uses these sentences: the pack line stays "The domain pack ($297) is on this payment." Do not add a line that the fee was removed. Do not put internal desk notes in the email or the calendar invite. The Stripe SKU stays stage-b.
