import '@testing-library/jest-dom/vitest';
import { Router, RouterProvider } from '@revealui/router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HERO_HEADLINE, HERO_PROOF, HERO_RESULT, HERO_SHOP_LINE } from '@/components/agency/Hero';
import { STUDIO_FOR_TITLE } from '@/components/agency/WhoStudioIsFor';
import { FLEET_NAME } from '@/lib/fleet';
import { OUTCOME_OPTIONS } from '@/lib/quote';
import { CONTACT_EMAIL, INTRO_CALL_URL, PRODUCT_SITE_URL } from '@/lib/site';
import { HomePage } from '@/routes/HomePage';

function renderHome() {
  const router = new Router();
  router.registerRoutes([{ path: '/', component: HomePage }]);
  window.history.pushState({}, '', '/');
  return render(
    <RouterProvider router={router}>
      <HomePage />
    </RouterProvider>,
  );
}

describe('HomePage', () => {
  it('keeps one startups headline, the calculator, and the intro', () => {
    renderHome();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: HERO_HEADLINE,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: STUDIO_FOR_TITLE })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Trust' })).toBeInTheDocument();
    expect(document.getElementById('who')).not.toBeNull();
    expect(document.getElementById('trust')).not.toBeNull();
    expect(document.getElementById('calculator')).not.toBeNull();
    expect(screen.getByRole('radio', { name: 'Studio implements with me' })).toBeChecked();
    const intros = screen.getAllByRole('link', { name: 'Book a 30-minute intro' });
    expect(intros.length).toBeGreaterThanOrEqual(1);
    for (const intro of intros) {
      expect(intro).toHaveAttribute('href', INTRO_CALL_URL);
    }
    expect(screen.getAllByRole('link', { name: CONTACT_EMAIL }).length).toBeGreaterThan(0);
  });

  it('shows an honest RevealFleet family highlight before the calculator', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 2, name: FLEET_NAME })).toBeInTheDocument();
    const buy = screen.getByRole('link', { name: 'RevealUI on revealui.com' });
    expect(buy).toHaveAttribute('href', PRODUCT_SITE_URL);
    const fleet = screen.getByRole('heading', { level: 2, name: FLEET_NAME }).closest('section');
    const calculator = document.getElementById('calculator');
    expect(fleet).not.toBeNull();
    expect(calculator).not.toBeNull();
    expect(
      Boolean(
        fleet &&
          calculator &&
          fleet.compareDocumentPosition(calculator) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  });

  it('does not show banned catalog, compliance, or proof copy', () => {
    const { container } = renderHome();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\$25,?000/);
    expect(text).not.toMatch(/\$50,?000/);
    expect(text).not.toMatch(/8,?499/);
    expect(text).not.toMatch(/Agency Kit/i);
    expect(text).toContain('Consultation $300');
    expect(text).toContain('Pilot $1,500');
    expect(text).toContain('Launch $7,500');
    expect(text).not.toMatch(/\bHour\b/);
    expect(text).not.toMatch(/Starter Kit/i);
    expect(text).not.toMatch(/waitlist/i);
    expect(text).not.toMatch(/HIPAA/i);
    expect(text).toContain('RevealUI Studio is not SOC 2 or ISO 27001 certified today.');
    expect(text).not.toMatch(/We are SOC ?2 certified/i);
    expect(text).not.toMatch(/In audit/i);
    expect(text).not.toMatch(/Our stack is SOC ?2 because Neon/i);
    expect(text).not.toMatch(/SOC2 ready/i);
    expect(text).not.toMatch(/24\/7/);
    expect(text).not.toMatch(/testimonial/i);
    expect(text).not.toMatch(/case study/i);
    expect(text).not.toMatch(/paying customer/i);
    expect(text).not.toMatch(/cal\.com/i);
    expect(text).not.toMatch(/live-or-holdback/i);
    expect(text).not.toMatch(/four tests/i);
    expect(text).not.toMatch(/signup-to-paid/i);
    expect(text).not.toMatch(/first half back/i);
    expect(text).toContain(HERO_SHOP_LINE);
    expect(text).toContain(HERO_RESULT);
    expect(text).toContain(HERO_PROOF);
    expect(text).not.toMatch(/make-good/i);
    expect(text).toMatch(/RevealFleet/);
    expect(text).not.toMatch(/RevForge|RevKit|RevDev|Agency Perpetual/);
    expect(text).toContain('More than one — book an intro');
    expect(
      OUTCOME_OPTIONS.reduce(
        (next, option) => next.replaceAll(option.label, ''),
        text.replaceAll('More than one — book an intro', '').replaceAll(HERO_PROOF, ''),
      ),
    ).not.toContain('\u2014');
  });
});
