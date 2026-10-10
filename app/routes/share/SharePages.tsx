import type { ReactNode } from 'react';
import { ShareFrame } from '@/components/share/ShareFrame';
import { STAGE_B_ADDON, STAGE_B_DETAIL } from '@/lib/consultation-buyer';
import { DOMAIN_ADD_ON_LABEL, type DomainPackPageId, domainPackLines } from '@/lib/domain-pack';
import { STAGE_B_PRICE } from '@/lib/engagements';
import { isShareSeed } from '@/lib/share-host';

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
          Your consultation workspace at {slug}.revealuistudio.com. Open the available material
          below to review your session and next steps.
        </p>
        <p>
          {STAGE_B_ADDON} {STAGE_B_DETAIL}
        </p>
        <p>
          The {DOMAIN_ADD_ON_LABEL} is {STAGE_B_PRICE} on its own after Consultation, or included
          with Pilot and Launch. The studio attaches the DNS.
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
        <p>
          Session material for {slug}. Prepared content appears in the workspace when it has been
          added.
        </p>
      </Frame>
    );
  };
}

export function shareDemo(slug: string) {
  return function ShareDemo() {
    return (
      <Frame slug={slug} title="Demo">
        <p>
          Example workspace for {slug}. This is demonstration content, not completed client work.
        </p>
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
  if (!isShareSeed(slug)) {
    function PrivateConsultation() {
      return (
        <main className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="text-3xl font-bold">Private consultation material</h1>
          <p className="mt-6">
            Sign in with the verified account that received access to your published session
            material.
          </p>
          <a
            className="mt-6 inline-block underline"
            href="https://admin.revealui.com/client-shares"
          >
            Open your client shares
          </a>
        </main>
      );
    }
    const meta = {
      title: 'Private consultation material | RevealUI Studio',
      description: 'Sign in to access your published consultation material.',
      ...SHARE_META,
    };
    return [
      { path: '/', component: PrivateConsultation, meta },
      { path: '/*notfound', component: PrivateConsultation, meta },
    ];
  }
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
        description: `DNS card for the ${DOMAIN_ADD_ON_LABEL} on ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/path',
      component: domainPackPage(slug, 'path', 'Path note'),
      meta: {
        title: `Path note | ${slug}`,
        description: `Path note for the ${DOMAIN_ADD_ON_LABEL} on ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/proof-gap',
      component: domainPackPage(slug, 'proof-gap', 'Proof-gap map'),
      meta: {
        title: `Proof-gap map | ${slug}`,
        description: `Proof-gap map for the ${DOMAIN_ADD_ON_LABEL} on ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/stack',
      component: domainPackPage(slug, 'stack', 'Stack sketch'),
      meta: {
        title: `Stack sketch | ${slug}`,
        description: `Stack sketch for the ${DOMAIN_ADD_ON_LABEL} on ${host}.`,
        ...SHARE_META,
      },
    },
    {
      path: '/walkthrough',
      component: domainPackPage(slug, 'walkthrough', 'Walkthrough'),
      meta: {
        title: `Walkthrough | ${slug}`,
        description: `Walkthrough for the ${DOMAIN_ADD_ON_LABEL} on ${host}.`,
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
        description: `Onboarding for the ${DOMAIN_ADD_ON_LABEL} on ${host}.`,
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
