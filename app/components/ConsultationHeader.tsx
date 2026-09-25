import { Link } from '@revealui/router';
import type React from 'react';
import { type CSSProperties } from 'react';

/** Slim transactional lockup. Circuit-R plus RevealUI Studio. Not the product wordmark. */
const CIRCUIT_R_NAV_SRC = '/revealui-mark.svg';
const CIRCUIT_R_NAV_PX = 32;

interface CircuitRChromeStyle extends CSSProperties {
  '--circuit-r-chrome-px': string;
}

function CircuitRMark(): React.JSX.Element {
  const box: CircuitRChromeStyle = {
    width: CIRCUIT_R_NAV_PX,
    height: CIRCUIT_R_NAV_PX,
    '--circuit-r-chrome-px': `${CIRCUIT_R_NAV_PX}px`,
  };
  return (
    <span data-circuit-r-chrome className="relative block shrink-0 overflow-hidden" style={box}>
      <img
        src={CIRCUIT_R_NAV_SRC}
        alt=""
        width={CIRCUIT_R_NAV_PX}
        height={CIRCUIT_R_NAV_PX}
        className="block size-full max-w-none"
      />
    </span>
  );
}

/** Book, success, and cancel. No marketing nav and no 30-minute intro CTA. */
export function ConsultationHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-3xl items-center px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <CircuitRMark />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              RevealUI Studio
            </span>
            <span className="block truncate text-xs text-muted-foreground">Consultation</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
