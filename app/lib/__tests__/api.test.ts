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

  it('does not treat an unconfirmed 200 response as accepted delivery', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: false }) });
    expect(
      await submitContact({
        name: 'Jo',
        email: 'jo@example.com',
        topic: 'general',
        message: 'A question about setup.',
      }),
    ).toContain('could not confirm');
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

    expect(err).toContain('could not confirm');
    expect(err).toContain(CONTACT_EMAIL);
    expect(err).not.toContain('Failed to fetch');
  });
  it.each([
    { name: 'x'.repeat(121) },
    { company: 'x'.repeat(121) },
    { topic: 'x'.repeat(41) },
    { message: 'x'.repeat(5001) },
    { email: `${'x'.repeat(244)}@example.com` },
  ])('rejects shared field limits before sending %j', async (override) => {
    const error = await submitContact({
      name: 'Jane',
      email: 'jane@example.com',
      topic: 'general',
      message: 'A question about setup.',
      ...override,
    });
    expect(error).not.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('normalizes shared fields and accepts their boundary lengths', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
    expect(
      await submitContact({
        name: ` ${'x'.repeat(120)} `,
        email: ' jane@example.com ',
        company: 'x'.repeat(120),
        topic: ' general ',
        message: 'x'.repeat(5000),
      }),
    ).toBeNull();
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1].body)).toEqual(
      expect.objectContaining({
        name: 'x'.repeat(120),
        email: 'jane@example.com',
        topic: 'general',
      }),
    );
  });
});
