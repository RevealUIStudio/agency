# Consultation confirmation email

TODO for a later sender: deliver this after the calendar event exists. The webhook already sends it when `RESEND_API_KEY` and `RESEND_FROM` are both set. A send failure must not roll back the calendar event.

Subject: `RevealUI Studio Consultation — {name}`

```
Payment received for your RevealUI Studio Consultation.

When: {start} – {end} (America/New_York on the calendar invite)
Meet: {meet link, or "The Meet link is on the calendar invite."}
Company: {company, when present}
Stage B was added to this payment.
OR
Stage B was not added to this payment.

Prep: send the system you want to look at and the question you want answered. A link is usually enough.
Questions: founder@revealui.com
```

Do not describe Stage B as free, included, or credited on this email. The add-on is either on the Checkout Session or absent.
