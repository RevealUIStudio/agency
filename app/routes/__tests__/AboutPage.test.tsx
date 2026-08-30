import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AboutPage } from '@/routes/AboutPage';

describe('AboutPage', () => {
  it('states 5+ years of retail telecom management, not ten years', () => {
    const { container } = render(<AboutPage />);
    const text = container.textContent ?? '';
    expect(text).toContain('5+ years');
    expect(text).toContain('Hour');
    expect(text).not.toMatch(/Enterprise/);
    expect(text).not.toMatch(/Working session/i);
    expect(text).not.toMatch(/ten years/i);
    expect(text).toContain(
      'Before this, 5+ years managing retail teams and operations in telecommunications, plus an event company and a stretch as a teacher. Not a first-time founder.',
    );
  });
});
