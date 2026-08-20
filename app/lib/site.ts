/**
 * Canonical external contact points for revealuistudio.com.
 *
 * Single source of truth — do NOT inline these as string literals in
 * components. The prior hardcoded Cal.com slug returned a 404 precisely
 * because the URL lived as loose, duplicated strings that drifted from the
 * real event. One constant, one place to change.
 */

/** Public 30-minute intro. No account. No payment on the calendar. */
export const INTRO_CALL_URL =
  'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ21UZVcuYp7yO32rZmhyUvZFDJcvles81E9edGNFwSUP8SHEVzGvq0gKgNFo7q04YS5i-12ZE5P';

/** @deprecated Use INTRO_CALL_URL. Kept so older imports keep compiling. */
export const DISCOVERY_CALL_URL = INTRO_CALL_URL;

/** Studio inbox — contact-form relay target + the direct-email / mailto fallback. */
export const CONTACT_EMAIL = 'founder@revealui.com';

/** Legal entity. Use only in the footer legal line and legal pages. */
export const STUDIO_LEGAL_NAME = 'REVEALUI STUDIO L.L.C.';

export const STUDIO_CITY = 'Maryville';
export const STUDIO_REGION = 'Tennessee';
export const STUDIO_SERVICE_AREA = 'Maryville, Alcoa, and Knoxville';

/**
 * Public broadcast list (essays / free subscribe).
 * Set 2026-08-11. Safe for footer "read the thesis" links.
 */
export const SUBSTACK_URL = 'https://substack.com/@revealuistudio';
