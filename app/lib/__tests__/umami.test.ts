import { describe, expect, it } from 'vitest';
import { readUmamiConfig, umamiScriptSrc } from '../umami';

const websiteId = '0fbf4090-7768-47f8-9f85-5ab24a822160';

describe('readUmamiConfig', () => {
  it('returns null when env is missing', () => {
    expect(readUmamiConfig({})).toBeNull();
    expect(readUmamiConfig({ VITE_UMAMI_URL: 'https://revealui-umami.fly.dev' })).toBeNull();
    expect(readUmamiConfig({ VITE_UMAMI_WEBSITE_ID: websiteId })).toBeNull();
  });

  it('accepts the production https origin and website id', () => {
    expect(
      readUmamiConfig({
        VITE_UMAMI_URL: 'https://revealui-umami.fly.dev/',
        VITE_UMAMI_WEBSITE_ID: websiteId,
      }),
    ).toEqual({
      url: 'https://revealui-umami.fly.dev',
      websiteId,
    });
  });

  it('rejects http and malformed ids', () => {
    expect(
      readUmamiConfig({
        VITE_UMAMI_URL: 'http://revealui-umami.fly.dev',
        VITE_UMAMI_WEBSITE_ID: websiteId,
      }),
    ).toBeNull();
    expect(
      readUmamiConfig({
        VITE_UMAMI_URL: 'https://revealui-umami.fly.dev',
        VITE_UMAMI_WEBSITE_ID: 'not-a-uuid',
      }),
    ).toBeNull();
  });

  it('builds the official tracker script URL', () => {
    expect(umamiScriptSrc('https://revealui-umami.fly.dev')).toBe(
      'https://revealui-umami.fly.dev/script.js',
    );
  });
});
