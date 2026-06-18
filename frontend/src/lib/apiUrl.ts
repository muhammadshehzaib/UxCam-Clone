function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function safeHostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Resolves the API base URL for the dashboard.
 *
 * - Server-side: prefer `API_URL` (Docker service URL), fall back to localhost.
 * - Client-side: prefer `NEXT_PUBLIC_API_URL`, but if it's set to localhost while the
 *   dashboard is opened from another host (e.g. phone on LAN), auto-switch to that host.
 */
export function resolveApiBaseUrl(): string {
  // Server-side
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? 'http://localhost:3001';
  }

  // Client-side
  const hostBased = `http://${window.location.hostname}:3001`;
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!envUrl) return hostBased;

  const envHostname = safeHostnameFromUrl(envUrl);
  if (
    envHostname &&
    isLocalHostname(envHostname) &&
    !isLocalHostname(window.location.hostname)
  ) {
    return hostBased;
  }

  return envUrl;
}

