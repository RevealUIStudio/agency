/**
 * Canonical external contact points for revealuistudio.com.
 *
 * Single source of truth — do NOT inline these as string literals in
 * components. The prior hardcoded Cal.com slug returned a 404 precisely
 * because the URL lived as loose, duplicated strings that drifted from the
 * real event. One constant, one place to change.
 *
 * Community homes (Skool / Substack / Discussions / Projects) are mapped in
 * fleet private `business/community-map-2026-08-10.md`. Agency primary CTA
 * remains discovery. Substack is broadcast only (not buyer support; Skool is).
 */
export const DISCOVERY_CALL_URL = 'https://cal.com/revealuistudio/discovery';

/** Studio inbox — contact-form relay target + the direct-email / mailto fallback. */
export const CONTACT_EMAIL = 'founder@revealui.com';

/**
 * Public broadcast list (essays / free subscribe).
 * Set 2026-08-11. Safe for footer "read the thesis" links.
 * Buyer support stays on Skool (invite-only after pay).
 */
export const SUBSTACK_URL = 'https://substack.com/@revealuistudio';
