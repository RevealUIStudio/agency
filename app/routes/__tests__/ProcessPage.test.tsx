import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LAUNCH_PACKAGE, WORKING_SESSION, WRITTEN_PLAN } from '@/lib/engagements';
import { CONTACT_EMAIL, INTRO_CALL_URL } from '@/lib/site';
import { ProcessPage } from '@/routes/ProcessPage';

describe('ProcessPage', () => {
  it('walks each locked offer: what you send, what you get, how long, what next', () => {
    const { container } = render(<ProcessPage />);
    const text = container.textContent ?? '';

    expect(screen.getByRole('heading', { level: 1, name: 'How we work' })).toBeInTheDocument();
    expect(text).toContain(WORKING_SESSION.name);
    expect(text).toContain(WRITTEN_PLAN.name);
    expect(text).toContain(LAUNCH_PACKAGE.name);
    expect(text).toContain(WORKING_SESSION.price);
    expect(text).toContain(WRITTEN_PLAN.price);
    expect(text).toContain(LAUNCH_PACKAGE.price);

    expect(document.getElementById(WORKING_SESSION.id)).not.toBeNull();
    expect(document.getElementById(WRITTEN_PLAN.id)).not.toBeNull();
    expect(document.getElementById(LAUNCH_PACKAGE.id)).not.toBeNull();

    expect(screen.getAllByRole('heading', { name: 'What you send' })).toHaveLength(3);
    expect(screen.getAllByRole('heading', { name: 'What you get' })).toHaveLength(3);
    expect(screen.getAllByRole('heading', { name: 'How long' })).toHaveLength(3);
    expect(screen.getAllByRole('heading', { name: 'What happens next' })).toHaveLength(3);

    expect(text).toContain('One hour');
    expect(text).toContain(WRITTEN_PLAN.payment);
    expect(text).toContain(LAUNCH_PACKAGE.payment);
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
});
