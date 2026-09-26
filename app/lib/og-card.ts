/**
 * Copy painted on public/og-card.png.
 *
 * There is no historical OG generator in this repo — only the static card.
 * These lines are the live hero / catalog strings (Hero.tsx + engagements.ts).
 * Do not invent a second headline. scripts/gen-og-card.mjs rasterizes this
 * fixture plus the transparent Circuit-R (public/favicon.svg). public-copy
 * tests walk this file as utf-8 and also read tEXt chunks from the PNG so a
 * raster swap cannot hide
 * retired identity copy.
 */

import { CONSULTATION, LAUNCH, PROOF_SPRINT } from '@/lib/engagements';

/**
 * Raster shop-line on public/og-card.png. Document title / OG title stay the
 * known-for H1. This card line is not the homepage H1 and is not the live
 * hero pain breath.
 */
export const OG_CARD_HEADLINE =
  'Tired of booking in one tab, invoices in another, and an agent in a third that leaves no receipt?';

/**
 * Locked public SKU line (same sentence as index.html / App.tsx meta).
 * Must stay equal to CONSULTATION + PROOF_SPRINT + LAUNCH names/prices.
 */
export const OG_CARD_SKU_LINE = 'Consultation $300. Proof Sprint $3,997. Launch $14,500.';

/** Catalog composition the SKU line must stay equal to. */
export const OG_CARD_SKU_FROM_OFFERS = `${CONSULTATION.name} ${CONSULTATION.price}. ${PROOF_SPRINT.name} ${PROOF_SPRINT.price}. ${LAUNCH.name} ${LAUNCH.price}.`;

export const OG_CARD_BOOKING_LINE = 'Book a 30-minute intro on Google Calendar.';

export const OG_CARD_URL = 'revealuistudio.com';

export const OG_CARD_PLATE = '#060d1a';
