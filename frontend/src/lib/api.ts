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
  TeamMember,
  PendingInvite,
  InviteInfo,
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
  tags?: string[];
  screen?: string;
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
  if (params?.tags?.length) qs.set('tags',        params.tags.join(','));
  if (params?.screen)       qs.set('screen',      params.screen);

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
  page?:          number;
  limit?:         number;
  device?:        string;
  os?:            string;
  browser?:       string;
  minDuration?:   string;  // seconds as string
  rageClick?:     boolean;
  search?:        string;
  traitFilters?:  { key: string; value: string }[];
}): Promise<PaginatedResponse<AppUser>> {
  const qs = new URLSearchParams();
  if (params?.page)        qs.set('page',        String(params.page));
  if (params?.limit)       qs.set('limit',       String(params.limit));
  if (params?.device)      qs.set('device',      params.device);
  if (params?.os)          qs.set('os',          params.os);
  if (params?.browser)     qs.set('browser',     params.browser);
  if (params?.minDuration) qs.set('minDuration', params.minDuration);
  if (params?.rageClick)   qs.set('rageClick',   'true');
  if (params?.search)       qs.set('search',      params.search);
  if (params?.traitFilters?.length) {
    for (const { key, value } of params.traitFilters) {
      qs.append('traitKey', key);
      qs.append('traitVal', value);
    }
  }
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

export async function getUserTraitKeys(): Promise<string[]> {
  const res = await apiFetch<{ data: string[] }>('/users/trait-keys');
  return res.data;
}

export async function getCustomEvents(days = 30): Promise<{ events: Array<{ name: string; count: number }>; total_events: number; unique_names: number }> {
  const res = await apiFetch<{ data: { events: Array<{ name: string; count: number }>; total_events: number; unique_names: number } }>(`/analytics/custom-events?days=${days}`);
  return res.data;
}

export async function getCustomEventTimeline(name: string, days = 30): Promise<Array<{ date: string; count: number }>> {
  const res = await apiFetch<{ data: Array<{ date: string; count: number }> }>(
    `/analytics/custom-events/${encodeURIComponent(name)}/timeline?days=${days}`
  );
  return res.data;
}

export async function getCrashTimeline(days = 30): Promise<Array<{ date: string; count: number }>> {
  const res = await apiFetch<{ data: Array<{ date: string; count: number }> }>(`/analytics/crashes/timeline?days=${days}`);
  return res.data;
}

export async function getHeatmap(screen: string, days = 30, device?: string): Promise<import('@/types').HeatmapPoint[]> {
  const qs = new URLSearchParams({ screen, days: String(days) });
  if (device) qs.set('device', device);
  const res = await apiFetch<{ data: import('@/types').HeatmapPoint[] }>(`/analytics/heatmap?${qs}`);
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

export async function regenerateApiKey(projectId: string): Promise<string> {
  const res = await apiFetch<{ data: { api_key: string } }>(`/projects/${projectId}/regenerate-key`, {
    method: 'POST',
  });
  return res.data.api_key;
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

// ── Team / Members ────────────────────────────────────────────────────────────

export async function getTeamMembers(projectId: string): Promise<{
  members: TeamMember[];
  invites: PendingInvite[];
}> {
  const res = await apiFetch<{ data: { members: TeamMember[]; invites: PendingInvite[] } }>(
    `/projects/${projectId}/members`
  );
  return res.data;
}

export async function createInvite(
  projectId: string,
  email: string,
  role: 'admin' | 'viewer'
): Promise<PendingInvite> {
  const res = await apiFetch<{ data: PendingInvite }>(`/projects/${projectId}/invites`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
  return res.data;
}

export async function removeTeamMember(projectId: string, userId: string): Promise<void> {
  await apiFetch(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
}

export async function getInviteInfo(token: string): Promise<InviteInfo> {
  const res = await apiFetch<{ data: InviteInfo }>(`/invites/${token}`);
  return res.data;
}

export async function acceptInvite(token: string): Promise<{ token: string; projectId: string }> {
  const res = await apiFetch<{ data: { token: string; projectId: string } }>(
    `/invites/${token}/accept`,
    { method: 'POST' }
  );
  return res.data;
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
