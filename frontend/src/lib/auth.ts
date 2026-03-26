const COOKIE_NAME    = 'uxclone_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export function getToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE_NAME}=`));
  return match ? match.split('=').slice(1).join('=') : '';
}

export function setToken(token: string): void {
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearToken(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function isAuthenticated(): boolean {
  return getToken().length > 0;
}
