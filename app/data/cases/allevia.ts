import type { CaseStudy } from './types';

export const allevia: CaseStudy = {
  slug: 'allevia',
  customer: 'Allevia Technology',
  industry: 'Healthcare technology',
  engagementShape: 'fleet-trial-kit',
  headline: 'A branded RevealUI Fleet deployment for Allevia Technology — built in weeks, not quarters.',
  summary:
    'Allevia Technology needed an agent-first business platform configured for their healthcare-adjacent workflow. RevealUI Studio delivered a stamped, branded RevealUI Fleet deployment with their branding, integrations, and a production handoff — using the same runtime RevealUI Studio maintains and ships publicly.',
  challenge:
    'Allevia had a working internal process and a clear product direction, but no production-ready platform to run it on. Building from scratch on commodity frameworks would have taken months and left them maintaining infrastructure that was not their core product. They needed a runtime their team could operate, extend, and hand off — not another bespoke codebase to own.',
  approach:
    'RevealUI Studio ran a fleet trial kit engagement: starting with a discovery call to scope the deployment, followed by a fixed-bid statement of work covering branding, integrations, and rollout. The deliverable was a stamped instance of the RevealUI Fleet runtime — customer-branded, configured to Allevia\'s environment, and handed off with documentation their team could operate without ongoing RevealUI Studio involvement. [NEEDS CUSTOMER APPROVAL: confirm this describes the scope as agreed]',
  outcome:
    'Allevia received a production-ready RevealUI Fleet deployment branded to their product, with [METRIC TBD] integrations wired and their team trained to operate it. Rollout completed in [METRIC TBD] weeks. [NEEDS CUSTOMER APPROVAL: confirm outcome description and all metrics before publishing]',
  quote: {
    text: '[NEEDS CUSTOMER APPROVAL: placeholder for a direct Allevia quote about the engagement]',
    attribution: 'Allevia Technology — [NEEDS CUSTOMER APPROVAL: name + title]',
    needsApproval: true,
  },
  metrics: [
    {
      label: 'Weeks to production handoff',
      value: '[METRIC TBD]',
      needsApproval: true,
    },
    {
      label: 'Integrations shipped',
      value: '[METRIC TBD]',
      needsApproval: true,
    },
  ],
  stack: [
    '@revealui/router',
    '@revealui/core',
    '@revealui/presentation',
    'RevealUI Fleet (stamped deployment)',
  ],
  timeline: '[METRIC TBD] weeks',
  published: false,
};
