import type { ReactNode } from 'react';
import { ShareFrame } from '@/components/share/ShareFrame';
import { STAGE_B_ADDON, STAGE_B_DETAIL } from '@/lib/consultation-buyer';
import { type DomainPackPageId, domainPackLines } from '@/lib/domain-pack';
import { STAGE_B_PRICE } from '@/lib/engagements';

function Frame({ slug, title, children }: { slug: string; title: string; children: ReactNode }) {
  return (
    <ShareFrame slug={slug} title={title}>
      {children}
    </ShareFrame>
  );
}

function Lines({ lines }: { lines: readonly string[] }) {
  return lines.map((line) => <p key={line}>{line}</p>);
}

export function shareHome(slug: string) {
  return function ShareHome() {
    return (
      <Frame slug={slug} title={`${slug} share`}>
        <p>
          Stage A shell for {slug}.revealuistudio.com. Circuit-R, RevealUI Studio, and this client
          name are the chrome.
        </p>
        <p>
          {STAGE_B_ADDON} {STAGE_B_DETAIL}
        </p>
        <p>
          The domain pack is {STAGE_B_PRICE} on its own, or included with Proof Sprint and Launch.
          The studio attaches the DNS.
        </p>
      </Frame>
    );
  };
}

function domainPackPage(slug: string, id: DomainPackPageId, title: string) {
  return function DomainPackPage() {
    return (
      <Frame slug={slug} title={title}>
        <Lines lines={domainPackLines(id, slug)} />
      </Frame>
    );
  };
}

export function sharePack(slug: string) {
  return function SharePack() {
    return (
      <Frame slug={slug} title="Pack">
        <p>Denser living pack for {slug}. The consultation leaves this pack on the studio host.</p>
      </Frame>
    );
  };
}

export function shareDemo(slug: string) {
  return function ShareDemo() {
    return (
      <Frame slug={slug} title="Demo">
        <p>Demo slot for {slug}. Example only. The domain pack does not sell a demo.</p>
      </Frame>
    );
  };
}

export function shareNotFound(slug: string) {
  return function ShareNotFound() {
    return (
      <Frame slug={slug} title="Not on this share">
        <p>
          This share host has Home, DNS card, Path note, Proof-gap map, Stack sketch, Onboarding,
          Walkthrough, Pack, and Demo.
        </p>
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
        description: `Stage A share shell for ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/dns',
      component: domainPackPage(slug, 'dns', 'DNS card'),
      meta: {
        title: `DNS card | ${slug}`,
        description: `DNS card for the domain pack on ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/path',
      component: domainPackPage(slug, 'path', 'Path note'),
      meta: {
        title: `Path note | ${slug}`,
        description: `Path note for the domain pack on ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/proof-gap',
      component: domainPackPage(slug, 'proof-gap', 'Proof-gap map'),
      meta: {
        title: `Proof-gap map | ${slug}`,
        description: `Proof-gap map for the domain pack on ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/stack',
      component: domainPackPage(slug, 'stack', 'Stack sketch'),
      meta: {
        title: `Stack sketch | ${slug}`,
        description: `Stack sketch for the domain pack on ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/walkthrough',
      component: domainPackPage(slug, 'walkthrough', 'Walkthrough'),
      meta: {
        title: `Walkthrough | ${slug}`,
        description: `Walkthrough for the domain pack on ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/pack',
      component: sharePack(slug),
      meta: {
        title: `Pack | ${slug}`,
        description: `Living pack for ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/onboarding',
      component: domainPackPage(slug, 'onboarding', 'Onboarding'),
      meta: {
        title: `Onboarding | ${slug}`,
        description: `Onboarding for the domain pack on ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/demo',
      component: shareDemo(slug),
      meta: {
        title: `Demo | ${slug}`,
        description: `Example demo slot for ${host}.`,
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
