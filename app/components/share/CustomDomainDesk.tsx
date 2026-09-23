import { useEffect, useState } from 'react';
import {
  CUSTOM_DOMAIN_CNAME_TARGET,
  customDomainTxtToken,
  type SharePack,
  saveSharePack,
  verifyCustomDomain,
  withCustomDomain,
} from '@/lib/share-stage-b';

/**
 * Admin desk for a pack's custom domain. Shows the CNAME target and TXT token.
 * Record checks use the values typed here. Nothing is looked up or written at a registrar.
 */
export function CustomDomainDesk({
  pack,
  onPack,
}: {
  pack: SharePack;
  onPack: (pack: SharePack) => void;
}) {
  const [draft, setDraft] = useState(pack.customDomain ?? '');
  const [observedCname, setObservedCname] = useState('');
  const [observedTxt, setObservedTxt] = useState('');

  useEffect(() => {
    setDraft(pack.customDomain ?? '');
  }, [pack.customDomain]);

  const token = pack.customDomain ? customDomainTxtToken(pack.customDomain) : '';

  function commit(next: SharePack) {
    saveSharePack(next);
    onPack(next);
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-border bg-card p-6"
      onSubmit={(event) => {
        event.preventDefault();
        commit(verifyCustomDomain(pack, { cname: observedCname, txt: observedTxt }));
      }}
    >
      <div>
        <label htmlFor="custom-domain" className="text-base font-semibold text-foreground">
          Custom domain
        </label>
        <input
          id="custom-domain"
          name="customDomain"
          value={draft}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            const updated = withCustomDomain(pack, next);
            if (next.trim() === '' || updated.customDomain) commit(updated);
          }}
          className="mt-4 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        CNAME target <code data-cname-target>{CUSTOM_DOMAIN_CNAME_TARGET}</code>
      </p>
      <p className="text-sm text-muted-foreground">
        TXT token <code data-txt-token>{token || 'Set a domain first'}</code>
      </p>
      <p data-custom-domain-status={pack.customDomainStatus} className="text-sm text-foreground">
        Status: {pack.customDomainStatus}
      </p>
      <div>
        <label htmlFor="observed-cname" className="text-sm font-semibold text-foreground">
          Observed CNAME
        </label>
        <input
          id="observed-cname"
          name="observedCname"
          value={observedCname}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setObservedCname(event.target.value)}
          className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
        />
      </div>
      <div>
        <label htmlFor="observed-txt" className="text-sm font-semibold text-foreground">
          Observed TXT
        </label>
        <input
          id="observed-txt"
          name="observedTxt"
          value={observedTxt}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setObservedTxt(event.target.value)}
          className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
        />
      </div>
      <button
        type="submit"
        className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground"
      >
        Apply supplied records
      </button>
    </form>
  );
}
