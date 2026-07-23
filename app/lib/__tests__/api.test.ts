import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { submitContact } from '@/lib/api';
import { CONTACT_EMAIL } from '@/lib/site';

describe('submitContact', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs JSON with source agency and returns null on success', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const err = await submitContact({
      name: 'Jane',
      email: 'jane@example.com',
      topic: 'general',
      message: 'Need a production-lift plan for our agent stack.',
    });

    expect(err).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.revealui.com/api/contact');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String(init.body))).toEqual({
      name: 'Jane',
      email: 'jane@example.com',
      topic: 'general',
      message: 'Need a production-lift plan for our agent stack.',
      source: 'agency',
    });
  });

  it('returns the server error body when present', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Rate limited. Try again later.' }),
    });

    const err = await submitContact({
      name: 'Jane',
      email: 'jane@example.com',
      topic: 'general',
      message: 'Need a production-lift plan for our agent stack.',
    });

    expect(err).toBe('Rate limited. Try again later.');
  });

  it('falls back to a status message when the body has no error', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    });

    const err = await submitContact({
      name: 'Jane',
      email: 'jane@example.com',
      topic: 'general',
      message: 'Need a production-lift plan for our agent stack.',
    });

    expect(err).toContain('status 500');
    expect(err).toContain(CONTACT_EMAIL);
  });

  it('maps network failures to a user-facing message', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Failed to fetch'));

    const err = await submitContact({
      name: 'Jane',
      email: 'jane@example.com',
      topic: 'general',
      message: 'Need a production-lift plan for our agent stack.',
    });

    expect(err).toBe(`Network error: Failed to fetch. Email ${CONTACT_EMAIL} directly.`);
  });
});
