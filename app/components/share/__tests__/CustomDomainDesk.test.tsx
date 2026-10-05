import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { CustomDomainDesk } from '@/components/share/CustomDomainDesk';
import {
  CUSTOM_DOMAIN_CNAME_TARGET,
  createSharePack,
  customDomainTxtToken,
  resolveSharePackId,
  type SharePack,
} from '@/lib/share-stage-b';

function Harness({
  initial,
  onChange,
}: {
  initial: SharePack;
  onChange: (pack: SharePack) => void;
}) {
  const [pack, setPack] = useState(initial);
  return (
    <CustomDomainDesk
      pack={pack}
      onPack={(next) => {
        setPack(next);
        onChange(next);
      }}
    />
  );
}

describe('CustomDomainDesk', () => {
  it('shows the CNAME target and TXT token, then goes live only when both match', () => {
    let current = createSharePack('demo', { id: 'demo-pack' });
    render(
      <Harness
        initial={current}
        onChange={(pack) => {
          current = pack;
        }}
      />,
    );
    expect(document.querySelector('[data-cname-target]')).toHaveTextContent(
      CUSTOM_DOMAIN_CNAME_TARGET,
    );
    expect(screen.getByText('Status: none')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Custom domain'), {
      target: { value: 'share.example.com' },
    });
    const token = customDomainTxtToken('share.example.com');
    expect(document.querySelector('[data-txt-token]')).toHaveTextContent(token);
    expect(screen.getByText('Status: pending_dns')).toBeInTheDocument();
    expect(resolveSharePackId('share.example.com', [current])).toBeNull();
    expect(resolveSharePackId('demo.revealuistudio.com', [current])).toBe('demo-pack');

    fireEvent.change(screen.getByLabelText('Observed CNAME'), {
      target: { value: 'example.net' },
    });
    fireEvent.change(screen.getByLabelText('Observed TXT'), {
      target: { value: token },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply supplied records' }));
    expect(screen.getByText('Status: pending_dns')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Observed CNAME'), {
      target: { value: CUSTOM_DOMAIN_CNAME_TARGET },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply supplied records' }));
    expect(screen.getByText('Status: live')).toBeInTheDocument();
    expect(resolveSharePackId('demo.revealuistudio.com', [current])).toBe('demo-pack');
    expect(resolveSharePackId('share.example.com', [current])).toBe('demo-pack');
  });
});
