import type { ReactNode } from 'react';
import { ShareFrame } from '@/components/share/ShareFrame';
import { STAGE_B_PRICE } from '@/lib/engagements';

function Frame({ slug, title, children }: { slug: string; title: string; children: ReactNode }) {
  return (
    <ShareFrame slug={slug} title={title}>
      {children}
    </ShareFrame>
  );
}

export function shareHome(slug: string) {
  return function ShareHome() {
    return (
      <Frame slug={slug} title={`${slug} share`}>
        <p>
          Stage A shell for {slug}.revealuistudio.com. Circuit-R, RevealUI Studio, and this client
          name are the chrome. The page is an example until a real pack is attached.
        </p>
        <p>
          Stage B is {STAGE_B_PRICE} on its own, or included with Proof Sprint and Launch. Wildcard
          DNS is attached by the owner, not by this page.
        </p>
      </Frame>
    );
  };
}

export function shareWalkthrough(slug: string) {
  return function ShareWalkthrough() {
    return (
      <Frame slug={slug} title="Walkthrough">
        <p>Walkthrough placeholder. Replace this with the living walk for {slug}.</p>
      </Frame>
    );
  };
}

export function sharePack(slug: string) {
  return function SharePack() {
    return (
      <Frame slug={slug} title="Pack">
        <p>Denser living pack placeholder for {slug}. Consultation leaves this pack behind.</p>
      </Frame>
    );
  };
}

export function shareOnboarding(slug: string) {
  return function ShareOnboarding() {
    return (
      <Frame slug={slug} title="Onboarding">
        <p>Onboarding placeholder for {slug}.</p>
      </Frame>
    );
  };
}

export function shareDemo(slug: string) {
  return function ShareDemo() {
    return (
      <Frame slug={slug} title="Demo">
        <p>Demo placeholder for {slug}. Example only.</p>
      </Frame>
    );
  };
}

export function shareNotFound(slug: string) {
  return function ShareNotFound() {
    return (
      <Frame slug={slug} title="Not on this share">
        <p>This share host has Home, Walkthrough, Pack, Onboarding, and Demo.</p>
      </Frame>
    );
  };
}

const SHARE_META = {
  robots: 'noindex,nofollow',
} as const;

export function shareRouteTable(slug: string) {
  const host = `${slug}.revealuistudio.com`;
  return [
    {
      path: '/',
      component: shareHome(slug),
      meta: {
        title: `${slug} share | RevealUI Studio`,
        description: `EXAMPLE Stage A share shell for ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/walkthrough',
      component: shareWalkthrough(slug),
      meta: {
        title: `Walkthrough | ${slug}`,
        description: `EXAMPLE walkthrough placeholder for ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/pack',
      component: sharePack(slug),
      meta: {
        title: `Pack | ${slug}`,
        description: `EXAMPLE pack placeholder for ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/onboarding',
      component: shareOnboarding(slug),
      meta: {
        title: `Onboarding | ${slug}`,
        description: `EXAMPLE onboarding placeholder for ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/demo',
      component: shareDemo(slug),
      meta: {
        title: `Demo | ${slug}`,
        description: `EXAMPLE demo placeholder for ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/*notfound',
      component: shareNotFound(slug),
      meta: {
        title: `Not found | ${slug}`,
        description: `That path is not on the ${host} share shell.`,
        ...SHARE_META,
      },
    },
  ];
}
