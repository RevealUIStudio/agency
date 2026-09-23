# Consultation confirmation email

TODO: send this after `checkout.session.completed` once a mailer is configured.
Resend is not in this repo. The webhook builds the payload and does not deliver it.
Google Calendar `sendUpdates=all` is the invite that carries the Meet link.

Do not send this by hand from the booker deploy until the owner has smoked the flow.

## Subject

Your RevealUI Studio Consultation

## Body

Payment received: {amount}.

Appointment: {start} to {end} (Eastern Time).

Meet: {meet_link}

Prep: bring the critical path, what is live today, and the decision you want from the session.

Company on the booking: {company}

Desk status: consultation_paid to consultation_scheduled.
