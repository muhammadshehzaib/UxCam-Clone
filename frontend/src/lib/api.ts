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
  PaginatedResponse,
} from '@/types';

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TOKEN = process.env.DASHBOARD_TOKEN ?? 'dev-dashboard-token';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
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
  dateFrom?: string;
  dateTo?: string;
  minDuration?: string; // seconds as string
}): Promise<PaginatedResponse<Session>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.userId) qs.set('userId', params.userId);
  if (params?.device) qs.set('device', params.device);
  if (params?.os) qs.set('os', params.os);
  if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params?.dateTo) qs.set('dateTo', params.dateTo);
  if (params?.minDuration) qs.set('minDuration', params.minDuration);

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

export async function getUsers(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<AppUser>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
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
