/**
 * Live product facts for the studio homepage.
 *
 * Product licenses live on revealui.com. Do not sell parked or internal
 * SKUs on this page. Do not promote a product family name that is not
 * the live public catalog.
 */

export const LEAD_PRODUCT = 'RevealUI' as const;

/** Product catalog a stranger can buy on revealui.com. */
export const PRODUCT_CATALOG = {
  free: 'Free $0',
  pro: '$49',
  max: '$299',
  enterprise: 'Inquire',
  proPerpetual: '$1,499',
} as const;

export const REVVAULT_ROLE =
  'RevVault is encrypted secret management inside Pro. It is not a separate paid SKU on this page.' as const;
