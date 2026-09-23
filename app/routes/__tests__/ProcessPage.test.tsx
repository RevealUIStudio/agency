import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GUARDRAIL_BODY, GUARDRAIL_HEADING } from '@/content/guardrail';
import { LAUNCH, PUBLIC_OFFERS, CONSULTATION, PROOF_SPRINT } from '@/lib/engagements';
import { CONTACT_EMAIL, INTRO_CALL_URL } from '@/lib/site';
import { ProcessPage } from '@/routes/ProcessPage';

describe('ProcessPage', () => {
  it('walks each locked offer: what you send, what you get, how long, what next', () => {
    const { container } = render(<ProcessPage />);
    const text = container.textContent ?? '';

    expect(screen.getByRole('heading', { level: 1, name: 'How we work' })).toBeInTheDocument();
    expect(text).toContain(CONSULTATION.name);
    expect(text).toContain(PROOF_SPRINT.name);
    expect(text).toContain(LAUNCH.name);
    expect(text).toContain(CONSULTATION.price);
    expect(text).toContain(PROOF_SPRINT.price);
    expect(text).toContain(LAUNCH.price);

    expect(document.getElementById(CONSULTATION.id)).not.toBeNull();
    expect(document.getElementById(PROOF_SPRINT.id)).not.toBeNull();
    expect(document.getElementById(LAUNCH.id)).not.toBeNull();

    expect(screen.getAllByRole('heading', { name: 'What you send' })).toHaveLength(3);
    expect(screen.getAllByRole('heading', { name: 'What you get' })).toHaveLength(3);
    expect(screen.getAllByRole('heading', { name: 'How long' })).toHaveLength(3);
    expect(screen.getAllByRole('heading', { name: 'What happens next' })).toHaveLength(3);

    expect(text).toContain('Notes and a next step');
    expect(text).toContain('No leftover site');
    expect(text).toContain('One receipted action you operate');
    expect(text).toContain('Credits 100% to Launch');
    expect(text).toContain('Architecture work');
    expect(text).toContain(PROOF_SPRINT.payment);
    expect(text).toContain(LAUNCH.payment);
  });

  it('keeps the Google Calendar intro as the CTA', () => {
    render(<ProcessPage />);
    const intros = screen.getAllByRole('link', { name: 'Book a 30-minute intro' });
    expect(intros.length).toBeGreaterThanOrEqual(1);
    for (const intro of intros) {
      expect(intro).toHaveAttribute('href', INTRO_CALL_URL);
    }
    expect(screen.getAllByRole('link', { name: CONTACT_EMAIL }).length).toBeGreaterThan(0);
  });

  it('does not invent proof, retired SKUs, or booking hosts', () => {
    const { container } = render(<ProcessPage />);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/cal\.com/i);
    expect(text).not.toMatch(/testimonial/i);
    expect(text).not.toMatch(/case study/i);
    expect(text).not.toMatch(/paying customer/i);
    expect(text).not.toMatch(/Fleet Stamp|RevForge|Custom Build|AI Integration/i);
    expect(text).not.toMatch(/Enterprise/i);
    expect(text).not.toMatch(/hosted.?VM/i);
    expect(text).not.toMatch(/written plan/i);
    expect(text).not.toMatch(/\bdemo\b/i);
    expect(text).not.toMatch(/\bSpec\b/);
    expect(text).not.toMatch(/live-or-holdback/i);
    expect(text).not.toMatch(/four tests/i);
    expect(text).not.toMatch(/signup-to-paid/i);
    expect(text).not.toMatch(/first half back/i);
    expect(text).not.toMatch(/keep the stack/i);
    expect(text).not.toMatch(/make-good/i);
    expect(text).toContain('Half now, half on delivery.');
    expect(text).not.toMatch(/\$25,?000|\$50,?000/);
    expect(text).not.toMatch(/limited (spots|time)|act now|discount|sale ends/i);
  });

  it('mentions Guardrail as a scoping beat, not a fourth priced offer', () => {
    const { container } = render(<ProcessPage />);
    const text = container.textContent ?? '';

    expect(PUBLIC_OFFERS).toHaveLength(3);
    expect(screen.getByRole('heading', { level: 1, name: 'How we work' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: GUARDRAIL_HEADING })).toBeInTheDocument();
    expect(text).toContain(GUARDRAIL_BODY);
    expect(text).toContain('Included in how we scope Proof Sprint and Launch');
    expect(text).toContain('Not a separate SKU');
    expect(document.getElementById('guardrail-agent')).not.toBeNull();

    expect(text).not.toMatch(/\$3,?500/);
    expect(text).not.toMatch(/RevDev|RevForge/i);
    expect(text).not.toMatch(/SOC ?2 certified/i);
    expect(text).not.toMatch(/Maryville shop/i);
    expect(container.querySelectorAll('article')).toHaveLength(3);
    expect(text).not.toMatch(/Guardrail agent \(template\)\. \$/);
  });
});
