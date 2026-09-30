/**
 * Buyer-facing tool and infra language.
 *
 * Public copy names a category: scheduling tool, field-service CRM, payments
 * processor, phone/SMS, hosting provider, database, email provider, code
 * editor, AI model provider. Google Calendar and Google Meet stay written in
 * full. A docs or runbook page may name a product as a neutral install fact.
 * This module is the banned-name check for every other buyer-facing surface.
 */

export const TOOL_CATEGORIES = [
  'scheduling tool',
  'field-service CRM',
  'payments processor',
  'phone/SMS',
  'hosting provider',
  'database',
  'email provider',
  'code editor',
  'AI model provider',
] as const;

export interface BannedNameHit {
  readonly category: string;
  readonly name: string;
}

interface CategoryPattern {
  readonly category: string;
  readonly source: string;
  readonly flags?: string;
}

/**
 * One pattern per category. The match is a product name that violates that
 * category. Copy should use the category, not the product.
 */
const CATEGORY_PATTERNS: readonly CategoryPattern[] = [
  {
    category: 'scheduling tool',
    source: String.raw`\b(?:Calendly|Cal\.com|SavvyCal)\b|\bMeet\b|\bGoogle\b`,
  },
  {
    category: 'field-service CRM',
    source: String.raw`\b(?:Jobber|ServiceTitan|Housecall|QuickBooks|QBO|HubSpot|Salesforce|HoneyBook|GoHighLevel|Shopify)\b`,
    flags: 'i',
  },
  {
    category: 'payments processor',
    source: 'stripe|\\b(?:Square|Braintree|PayPal|Coinbase)\\b',
    flags: 'i',
  },
  {
    category: 'phone/SMS',
    source: String.raw`\b(?:Twilio|MessageBird|Vonage)\b`,
    flags: 'i',
  },
  {
    category: 'hosting provider',
    source: String.raw`\b(?:Vercel|Netlify|Heroku|Railway)\b|\bFly\.io\b|\bSpeed Insights\b`,
    flags: 'i',
  },
  {
    category: 'hosting provider',
    source: String.raw`\bRender\b`,
  },
  {
    category: 'database',
    source: String.raw`\b(?:Neon(?:DB)?|Supabase|PlanetScale|Firebase)\b`,
    flags: 'i',
  },
  {
    category: 'email provider',
    source: String.raw`\b(?:Resend|SendGrid|Mailgun|Postmark)\b|\bGoogle Workspace\b`,
    flags: 'i',
  },
  {
    category: 'code editor',
    source: String.raw`\b(?:Cursor|VS Code|Visual Studio Code|Zed|Copilot|Claude Code)\b`,
  },
  {
    category: 'AI model provider',
    source: String.raw`\b(?:OpenAI|Anthropic|Claude|Groq|Hugging(?: ?Face)?|Ollama|Ubuntu)\b`,
    flags: 'i',
  },
  {
    category: 'AI model provider',
    source: String.raw`\bCanonical\b`,
  },
  {
    category: 'error telemetry',
    source: String.raw`\bSentry\b`,
  },
  {
    category: 'pageview analytics',
    source: String.raw`\bUmami\b`,
  },
  {
    category: 'team chat',
    source: String.raw`\bSlack\b`,
    flags: 'i',
  },
  {
    category: 'source host',
    source: String.raw`\bGitHub\b`,
    flags: 'i',
  },
  {
    category: 'auth service',
    source: String.raw`\b(?:Clerk|Auth0|NextAuth)\b`,
    flags: 'i',
  },
  {
    category: 'content system',
    source: String.raw`\b(?:Contentful|Strapi)\b|\b(?:Sanity|Payload)\b`,
  },
  {
    category: 'admin framework',
    source: String.raw`\b(?:Retool|AdminJS)\b`,
    flags: 'i',
  },
  {
    category: 'component library',
    source: String.raw`\b(?:Radix|MUI|Chakra|Headless UI|React Aria)\b`,
  },
  {
    category: 'object storage',
    source: String.raw`\b(?:Cloudflare|MinIO)\b|\bR2\b|\bAWS\b`,
  },
  {
    category: 'automation foil',
    source: String.raw`\b(?:Zapier|Zaps?|n8n|IFTTT|Airtable|Apify)\b|Make\.com`,
    flags: 'i',
  },
  {
    category: 'tool registry',
    source: String.raw`\b(?:Smithery|OpenTools|Glama|mcpt)\b`,
    flags: 'i',
  },
  {
    category: 'named vendor',
    source: String.raw`\b(?:Palantir|Databricks|a16z|AT&T|T-Mobile)\b`,
    flags: 'i',
  },
];

/** Drop URLs, import specifiers, and the two allowed Google product names. */
export function prepareBuyerCopy(text: string): string {
  return text
    .replace(/https?:\/\/[^\s)'"<>]+/gi, ' ')
    .replace(/\bgithub\.com\S*/gi, ' ')
    .replace(/\bfrom\s+['"][^'"]+['"]/g, ' ')
    .replace(/\bimport\s+['"][^'"]+['"]/g, ' ')
    .replace(/Google Calendar/g, ' ')
    .replace(/Google Meet/g, ' ')
    .replace(/\bcursor-/g, 'pointer-');
}

export function findBannedToolNames(text: string): BannedNameHit[] {
  const masked = prepareBuyerCopy(text);
  const hits: BannedNameHit[] = [];
  for (const rule of CATEGORY_PATTERNS) {
    const re = new RegExp(rule.source, rule.flags ? `${rule.flags}g` : 'g');
    for (const match of masked.matchAll(re)) {
      const name = match[0];
      if (name) hits.push({ category: rule.category, name });
    }
  }
  return hits;
}
