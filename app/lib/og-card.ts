/**
 * Copy painted on public/og-card.png.
 *
 * There is no historical OG generator in this repo. Only the static card.
 * These lines are the live hero / catalog strings (Hero.tsx + engagements.ts).
 * Do not invent a second headline. scripts/gen-og-card.mjs rasterizes this
 * fixture plus the transparent Circuit-R (public/favicon.svg). public-copy
 * tests walk this file as utf-8 and also read tEXt chunks from the PNG so a
 * raster swap cannot hide
 * retired identity copy.
 */

import {
  ADAPTER_INCLUDED_ON_LAUNCH,
  ADAPTER_INCLUDED_ON_PILOT,
  CARE,
  CONSULTATION,
  LAUNCH,
  PILOT,
} from '@/lib/engagements';

/**
 * Raster shop-line on public/og-card.png. Document title / OG title stay the
 * known-for H1. This card line is not the homepage H1 and is not the live
 * hero pain breath.
 */
export const OG_CARD_HEADLINE = 'Build a business workflow your team can operate.';

/**
 * Locked public ladder painted on the card.
 * Proof Sprint is retired and must not appear.
 * Must stay equal to Consultation, Pilot, Launch, and Care.
 */
export const OG_CARD_SKU_LINE =
  'Consultation $300/hr, Pilot $3,997 (includes 1 Adapter), Launch $14,500 (up to 3 Adapters), Care $1,997/mo';

/** Catalog composition the SKU line must stay equal to. */
export const OG_CARD_SKU_FROM_OFFERS = `${CONSULTATION.name} ${CONSULTATION.price}/hr, ${PILOT.name} ${PILOT.price} (includes ${ADAPTER_INCLUDED_ON_PILOT} Adapter), ${LAUNCH.name} ${LAUNCH.price} (up to ${ADAPTER_INCLUDED_ON_LAUNCH} Adapters), ${CARE.name} ${CARE.price}`;

export const OG_CARD_BOOKING_LINE = 'Book a free 30-minute intro.';

export const OG_CARD_URL = 'revealuistudio.com';

export const OG_CARD_PLATE = '#060d1a';
