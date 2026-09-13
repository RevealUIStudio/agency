import { useEffect } from 'react';
import { readUmamiConfig, UMAMI_SCRIPT_FLAG, umamiScriptSrc } from '@/lib/umami';

/**
 * Injects the self-hosted Umami tracker once. Parent must only mount this
 * after analytics consent is true (same gate as Speed Insights).
 */
export function UmamiTracker() {
  useEffect(() => {
    const config = readUmamiConfig();
    if (!config) return;
    if (document.querySelector(`script[${UMAMI_SCRIPT_FLAG}]`)) return;

    const script = document.createElement('script');
    script.defer = true;
    script.src = umamiScriptSrc(config.url);
    script.dataset.websiteId = config.websiteId;
    script.setAttribute(UMAMI_SCRIPT_FLAG, '');
    document.head.appendChild(script);
  }, []);

  return null;
}
