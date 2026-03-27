import {
  Session,
  SessionEvent,
  AppUser,
  AnalyticsSummary,
  HeatmapPoint,
  Funnel,
  FunnelStep,
  FunnelResults,
  CrashGroup,
  CrashSession,
  Project,
  ScreenFlowData,
  Segment,
  SegmentFilters,
  RetentionData,
  PaginatedResponse,
} from '@/types';

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string {
  // Client-side: read from cookie
  if (typeof document !== 'undefined') {
    const match = document.cookie.split('; ').find((c) => c.startsWith('uxclone_token='));
    if (match) return match.split('=').slice(1).join('=');
  }
  // Server-side / test fallback: use env var
  return process.env.DASHBOARD_TOKEN ?? 'dev-dashboard-token';
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }

  return res.json();
}

export async function getSummary(days = 30): Promise<AnalyticsSummary> {
  const res = await apiFetch<{ data: AnalyticsSummary }>(`/analytics/summary?days=${days}`);
  return res.data;
}

export async function getSessionsOverTime(days = 30): Promise<Array<{ date: string; count: number }>> {
  const res = await apiFetch<{ data: Array<{ date: string; count: number }> }>(
    `/analytics/sessions-over-time?days=${days}`
  );
  return res.data;
}

export async function getSessions(params?: {
  page?: number;
  limit?: number;
  userId?: string;
  device?: string;
  os?: string;
  browser?: string;
  dateFrom?: string;
  dateTo?: string;
  minDuration?: string; // seconds as string
  rageClick?: boolean;
}): Promise<PaginatedResponse<Session>> {
  const qs = new URLSearchParams();
  if (params?.page)        qs.set('page',        String(params.page));
  if (params?.limit)       qs.set('limit',       String(params.limit));
  if (params?.userId)      qs.set('userId',      params.userId);
  if (params?.device)      qs.set('device',      params.device);
  if (params?.os)          qs.set('os',          params.os);
  if (params?.browser)     qs.set('browser',     params.browser);
  if (params?.dateFrom)    qs.set('dateFrom',    params.dateFrom);
  if (params?.dateTo)      qs.set('dateTo',      params.dateTo);
  if (params?.minDuration) qs.set('minDuration', params.minDuration);
  if (params?.rageClick)   qs.set('rageClick',   'true');

  return apiFetch<PaginatedResponse<Session>>(`/sessions?${qs}`);
}

export async function getSession(id: string): Promise<Session> {
  const res = await apiFetch<{ data: Session }>(`/sessions/${id}`);
  return res.data;
}

export async function getSessionEvents(sessionId: string): Promise<SessionEvent[]> {
  const res = await apiFetch<{ data: SessionEvent[] }>(`/sessions/${sessionId}/events`);
  return res.data;
}

export async function updateSessionNote(sessionId: string, note: string): Promise<void> {
  await apiFetch(`/sessions/${sessionId}/note`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });
}

export async function updateSessionTags(sessionId: string, tags: string[]): Promise<void> {
  await apiFetch(`/sessions/${sessionId}/tags`, {
    method: 'PATCH',
    body: JSON.stringify({ tags }),
  });
}

export async function getUsers(params?: {
  page?:        number;
  limit?:       number;
  device?:      string;
  os?:          string;
  browser?:     string;
  minDuration?: string;  // seconds as string
  rageClick?:   boolean;
  search?:      string;
}): Promise<PaginatedResponse<AppUser>> {
  const qs = new URLSearchParams();
  if (params?.page)        qs.set('page',        String(params.page));
  if (params?.limit)       qs.set('limit',       String(params.limit));
  if (params?.device)      qs.set('device',      params.device);
  if (params?.os)          qs.set('os',          params.os);
  if (params?.browser)     qs.set('browser',     params.browser);
  if (params?.minDuration) qs.set('minDuration', params.minDuration);
  if (params?.rageClick)   qs.set('rageClick',   'true');
  if (params?.search)      qs.set('search',      params.search);
  return apiFetch<PaginatedResponse<AppUser>>(`/users?${qs}`);
}

export async function getUser(id: string): Promise<AppUser> {
  const res = await apiFetch<{ data: AppUser }>(`/users/${id}`);
  return res.data;
}

export async function getUserSessions(userId: string, params?: {
  page?: number;
}): Promise<PaginatedResponse<Session>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  return apiFetch<PaginatedResponse<Session>>(`/users/${userId}/sessions?${qs}`);
}

export async function getScreenFlow(days = 30): Promise<ScreenFlowData> {
  const res = await apiFetch<{ data: ScreenFlowData }>(`/analytics/screen-flow?days=${days}`);
  return res.data;
}

export async function getRetention(days = 90): Promise<RetentionData> {
  const res = await apiFetch<{ data: RetentionData }>(`/analytics/retention?days=${days}`);
  return res.data;
}

export async function getHeatmap(screen: string, days = 30): Promise<HeatmapPoint[]> {
  const qs = new URLSearchParams({ screen, days: String(days) });
  const res = await apiFetch<{ data: HeatmapPoint[] }>(`/analytics/heatmap?${qs}`);
  return res.data;
}

export async function getHeatmapScreens(days = 30): Promise<string[]> {
  const res = await apiFetch<{ data: string[] }>(`/analytics/screens?days=${days}`);
  return res.data;
}

export async function getFunnels(): Promise<Funnel[]> {
  const res = await apiFetch<{ data: Funnel[] }>('/funnels');
  return res.data;
}

export async function createFunnel(name: string, steps: FunnelStep[]): Promise<Funnel> {
  const res = await apiFetch<{ data: Funnel }>('/funnels', {
    method: 'POST',
    body: JSON.stringify({ name, steps }),
  });
  return res.data;
}

export async function deleteFunnel(id: string): Promise<void> {
  await apiFetch(`/funnels/${id}`, { method: 'DELETE' });
}

export async function getFunnelResults(id: string, days = 30): Promise<FunnelResults> {
  const res = await apiFetch<{ data: FunnelResults }>(`/funnels/${id}/results?days=${days}`);
  return res.data;
}

export async function getCrashGroups(days = 30): Promise<CrashGroup[]> {
  const res = await apiFetch<{ data: CrashGroup[] }>(`/analytics/crashes?days=${days}`);
  return res.data;
}

export async function getCrashSessions(
  message: string,
  filename?: string,
  days = 30
): Promise<CrashSession[]> {
  const qs = new URLSearchParams({ message, days: String(days) });
  if (filename) qs.set('filename', filename);
  const res = await apiFetch<{ data: CrashSession[] }>(`/analytics/crashes/sessions?${qs}`);
  return res.data;
}

export interface AuthResult {
  token: string;
  user: { id: string; email: string; name: string | null; projectId: string };
}

export async function authLogin(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? 'Login failed');
  }
  const body = await res.json() as { data: AuthResult };
  return body.data;
}

export async function getProjects(): Promise<Project[]> {
  const res = await apiFetch<{ data: Project[] }>('/projects');
  return res.data;
}

export async function createProject(name: string): Promise<{ project: Project; token: string }> {
  const res = await apiFetch<{ data: { project: Project; token: string } }>('/projects', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return res.data;
}

export async function switchProject(projectId: string): Promise<{ token: string; project: Project }> {
  const res = await apiFetch<{ data: { token: string; project: Project } }>(
    `/projects/${projectId}/switch`,
    { method: 'POST' }
  );
  return res.data;
}

export async function getSegments(): Promise<Segment[]> {
  const res = await apiFetch<{ data: Segment[] }>('/segments');
  return res.data;
}

export async function createSegment(name: string, filters: SegmentFilters): Promise<Segment> {
  const res = await apiFetch<{ data: Segment }>('/segments', {
    method: 'POST',
    body: JSON.stringify({ name, filters }),
  });
  return res.data;
}

export async function updateSegment(id: string, name: string, filters: SegmentFilters): Promise<Segment> {
  const res = await apiFetch<{ data: Segment }>(`/segments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, filters }),
  });
  return res.data;
}

export async function deleteSegment(id: string): Promise<void> {
  await apiFetch(`/segments/${id}`, { method: 'DELETE' });
}

/** Fetches a CSV export and triggers a browser download. */
export async function downloadCsv(
  path: string,
  filename: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const text = await res.text();
  const blob = new Blob([text], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function authRegister(
  email: string,
  password: string,
  projectName: string,
  name?: string
): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, projectName, name }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? 'Registration failed');
  }
  const body = await res.json() as { data: AuthResult };
  return body.data;
}
