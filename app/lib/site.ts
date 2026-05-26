/**
 * Canonical external contact points for revealuistudio.com.
 *
 * Single source of truth — do NOT inline these as string literals in
 * components. The prior hardcoded Cal.com slug returned a 404 precisely
 * because the URL lived as loose, duplicated strings that drifted from the
 * real event. One constant, one place to change.
 */
export const DISCOVERY_CALL_URL = 'https://cal.com/revealuistudio/discovery';

/** Studio inbox — contact-form relay target + the direct-email / mailto fallback. */
export const CONTACT_EMAIL = 'founder@revealui.com';
