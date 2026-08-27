import '@testing-library/jest-dom/vitest';
import { Router, RouterProvider } from '@revealui/router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CONTACT_EMAIL, INTRO_CALL_URL } from '@/lib/site';
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
  it('keeps one product-studio headline, the calculator, and the intro', () => {
    renderHome();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /A product studio for runtime, receipts, Launch, and Enterprise\./,
      }),
    ).toBeInTheDocument();
    expect(document.getElementById('calculator')).not.toBeNull();
    expect(screen.getByRole('radio', { name: 'You will (Studio)' })).toBeChecked();
    const intros = screen.getAllByRole('link', { name: 'Book a 30-minute intro' });
    expect(intros.length).toBeGreaterThanOrEqual(1);
    for (const intro of intros) {
      expect(intro).toHaveAttribute('href', INTRO_CALL_URL);
    }
    expect(screen.getAllByRole('link', { name: CONTACT_EMAIL }).length).toBeGreaterThan(0);
  });

  it('does not show banned catalog, compliance, or proof copy', () => {
    const { container } = renderHome();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\$25,?000/);
    expect(text).not.toMatch(/\$50,?000/);
    expect(text).not.toMatch(/8,?499/);
    expect(text).not.toMatch(/Agency Kit/i);
    expect(text).not.toMatch(/Starter Kit/i);
    expect(text).not.toMatch(/waitlist/i);
    expect(text).not.toMatch(/HIPAA/i);
    expect(text).not.toMatch(/SOC 2/i);
    expect(text).not.toMatch(/24\/7/);
    expect(text).not.toMatch(/testimonial/i);
    expect(text).not.toMatch(/case study/i);
    expect(text).not.toMatch(/paying customer/i);
    expect(text).not.toMatch(/cal\.com/i);
  });
});
