export function normalizeLinkedInUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.protocol = 'https:';
    parsed.host = parsed.host.toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.toString();
  } catch {
    return (url || '').trim().replace(/\/+$/, '');
  }
}
