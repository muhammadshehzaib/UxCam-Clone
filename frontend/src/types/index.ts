export interface Session {
  id: string;
  anonymous_id: string;
  user_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  device_type: string | null;
  os: string | null;
  os_version: string | null;
  browser: string | null;
  browser_version: string | null;
  app_version: string | null;
  country: string | null;
  city: string | null;
  screen_width: number | null;
  screen_height: number | null;
  event_count: number;
  external_id: string | null;
  traits: Record<string, unknown> | null;
}

export interface SessionEvent {
  id: number;
  type: string;
  timestamp: string;
  elapsed_ms: number;
  x: number | null;
  y: number | null;
  target: string | null;
  screen_name: string | null;
  value: string | null;
  metadata: Record<string, unknown>;
}

export interface AppUser {
  id: string;
  external_id: string | null;
  anonymous_id: string;
  traits: Record<string, unknown>;
  first_seen_at: string;
  last_seen_at: string;
  session_count: number;
}

export interface AnalyticsSummary {
  totalUsers: number;
  totalSessions: number;
  avgSessionDurationMs: number;
  topEvents: Array<{ name: string; count: number }>;
  topScreens: Array<{ name: string; count: number }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}
