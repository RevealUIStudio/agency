/**
 * Honest RevealFleet facts for the studio homepage.
 *
 * Public copy says RevealFleet. Do not shorten the public family name.
 * Product licenses live on revealui.com. Do not sell parked or internal
 * SKUs on this page.
 */

export const FLEET_NAME = 'RevealFleet' as const;
export const LEAD_PRODUCT = 'RevealUI' as const;

/** Product catalog a stranger can buy on revealui.com. */
export const PRODUCT_CATALOG = {
  free: 'Free',
  pro: '$49',
  max: '$299',
  enterprise: 'Inquire',
} as const;

export const REVVAULT_ROLE =
  'RevVault is encrypted secret management inside Pro. It is not a separate paid SKU on this page.' as const;
