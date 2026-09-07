/**
 * Copy painted on public/og-card.png.
 *
 * There is no historical OG generator in this repo — only the static card.
 * These lines are the live hero / catalog strings (Hero.tsx + engagements.ts).
 * Do not invent a second headline. scripts/gen-og-card.mjs rasterizes this
 * fixture plus the Circuit-R tile. public-copy tests walk this file as utf-8
 * and also read tEXt chunks from the PNG so a raster swap cannot hide
 * retired identity copy.
 */

import { LAUNCH_PACKAGE, WORKING_SESSION, WRITTEN_PLAN } from '@/lib/engagements';

/** Hero h1. Same sentence as app/components/agency/Hero.tsx HERO_SHOP_LINE. */
export const OG_CARD_HEADLINE =
  'Tired of booking in one tab, invoices in another, and an agent in a third that leaves no receipt?';

/**
 * Locked public SKU line (same sentence as index.html / App.tsx meta).
 * Must stay equal to WORKING_SESSION + WRITTEN_PLAN + LAUNCH_PACKAGE names/prices.
 */
export const OG_CARD_SKU_LINE = 'Consultation $300. Pilot $1,500. Launch $7,500.';

/** Catalog composition the SKU line must stay equal to. */
export const OG_CARD_SKU_FROM_OFFERS = `${WORKING_SESSION.name} ${WORKING_SESSION.price}. ${WRITTEN_PLAN.name} ${WRITTEN_PLAN.price}. ${LAUNCH_PACKAGE.name} ${LAUNCH_PACKAGE.price}.`;

export const OG_CARD_BOOKING_LINE = 'Book a 30-minute intro on Google Calendar.';

export const OG_CARD_URL = 'revealuistudio.com';

export const OG_CARD_PLATE = '#060d1a';
