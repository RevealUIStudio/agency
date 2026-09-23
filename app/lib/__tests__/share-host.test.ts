import { describe, expect, it } from 'vitest';
import { clientSlugFromHost, RESERVED_SHARE_LABELS, SHARE_SEED_SLUG } from '@/lib/share-host';

describe('clientSlugFromHost', () => {
  it('keeps the studio apex and www on the public site', () => {
    expect(clientSlugFromHost('revealuistudio.com')).toBeNull();
    expect(clientSlugFromHost('www.revealuistudio.com')).toBeNull();
    expect(clientSlugFromHost('WWW.RevealUIStudio.com.')).toBeNull();
  });

  it('reads the client slug from a share host, including the omega seed', () => {
    expect(clientSlugFromHost('omega.revealuistudio.com')).toBe(SHARE_SEED_SLUG);
    expect(clientSlugFromHost('Omega.revealuistudio.com:443')).toBe('omega');
    expect(clientSlugFromHost('acme.revealuistudio.com')).toBe('acme');
    expect(clientSlugFromHost('omega.localhost')).toBe('omega');
  });

  it('rejects reserved labels and non-share hosts', () => {
    for (const label of RESERVED_SHARE_LABELS) {
      expect(clientSlugFromHost(`${label}.revealuistudio.com`)).toBeNull();
    }
    expect(clientSlugFromHost('localhost')).toBeNull();
    expect(clientSlugFromHost('agency-git-feat.vercel.app')).toBeNull();
    expect(clientSlugFromHost('not a host')).toBeNull();
  });
});
