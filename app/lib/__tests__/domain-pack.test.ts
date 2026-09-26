import { describe, expect, it } from 'vitest';
import {
  consultationStageLine,
  STAGE_B_ADDON,
  STAGE_B_CHECKBOX,
  STAGE_B_DETAIL,
  STAGE_B_ON_ORDER,
} from '@/lib/consultation-buyer';
import {
  DOMAIN_PACK_CREDIT_LABEL,
  DOMAIN_PACK_DUE_LABEL,
  DOMAIN_PACK_LIST_LABEL,
  DOMAIN_PACK_PAGES,
  domainPackLines,
  SHARE_NAV,
} from '@/lib/domain-pack';
import { SHARE_PATHS } from '@/lib/share-host';
import { CUSTOM_DOMAIN_CNAME_TARGET } from '@/lib/share-stage-b';
import { buildStageBInvoice } from '@/lib/stage-b-invoice';

const BUYER_COPY = [
  STAGE_B_ADDON,
  STAGE_B_CHECKBOX,
  STAGE_B_DETAIL,
  STAGE_B_ON_ORDER,
  consultationStageLine(true),
];

describe('domain pack offer', () => {
  it('names the add-on Domain pack and keeps the public book copy free of a credit', () => {
    expect(STAGE_B_CHECKBOX).toBe('Add the domain pack ($297)');
    expect(STAGE_B_DETAIL).toContain('path note');
    expect(STAGE_B_DETAIL).toContain('proof-gap map');
    expect(STAGE_B_DETAIL).toContain('stack sketch');
    expect(STAGE_B_DETAIL).toContain('onboarding page');
    expect(STAGE_B_DETAIL).toContain('walkthrough');
    expect(STAGE_B_DETAIL).toContain('We attach the DNS.');
    for (const line of BUYER_COPY) {
      expect(line).not.toMatch(/\bincluded\b|\bwaiv|\bfree\b|\bcredit/i);
    }
    expect(consultationStageLine(false)).toBe('This payment is the consultation only.');
  });

  it('publishes the six bundle pages on the share, with the DNS card filled in', () => {
    expect(SHARE_NAV.map((item) => item.href)).toEqual([...SHARE_PATHS]);
    expect(DOMAIN_PACK_PAGES.map((page) => page.path)).toEqual([
      '/dns',
      '/path',
      '/proof-gap',
      '/stack',
      '/onboarding',
      '/walkthrough',
    ]);
    const dns = domainPackLines('dns', 'demo').join('\n');
    expect(dns).toContain('Studio host: demo.revealuistudio.com');
    expect(dns).toContain(`CNAME target: ${CUSTOM_DOMAIN_CNAME_TARGET}`);
    expect(dns).toContain('The studio attaches the DNS.');
    expect(domainPackLines('path', 'demo').join('\n')).toContain('Path A is the default');
    expect(domainPackLines('proof-gap', 'demo').join('\n')).toContain('proof-gap map');
    expect(domainPackLines('stack', 'demo').join('\n')).toContain('lightweight sketch');
    expect(domainPackLines('stack', 'demo').join('\n')).toContain(
      'Architecture, schema, and review stay inside Launch.',
    );
    expect(domainPackLines('onboarding', 'demo').join('\n')).toContain('what the share is');
    expect(domainPackLines('walkthrough', 'demo').join('\n')).toContain('one written walk');
  });

  it('keeps the invoice list label and the owner credit label on the domain pack', () => {
    const quoted = buildStageBInvoice({ attached: true, waive: false, role: 'guest' });
    expect(quoted.lines.map((line) => line.label)).toEqual([DOMAIN_PACK_LIST_LABEL]);
    const waived = buildStageBInvoice({ attached: true, waive: true, role: 'owner' });
    expect(waived.lines.map((line) => line.label)).toEqual([
      DOMAIN_PACK_LIST_LABEL,
      DOMAIN_PACK_CREDIT_LABEL,
    ]);
    expect(DOMAIN_PACK_DUE_LABEL).toBe('Domain pack due');
    expect(waived.dueCents).toBe(0);
    expect(waived.listCents).toBe(29_700);
  });
});
