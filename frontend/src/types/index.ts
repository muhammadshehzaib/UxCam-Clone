export interface SessionMetadata {
  rage_click?: boolean;
  rage_click_count?: number;
  rage_click_timestamps?: number[];
  [key: string]: unknown;
}

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
  metadata: SessionMetadata | null;
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

export interface HeatmapPoint {
  x: number;   // normalized 0–1
  y: number;   // normalized 0–1
  count: number;
}

export interface FunnelStep {
  screen: string;
}

export interface Funnel {
  id: string;
  project_id: string;
  name: string;
  steps: FunnelStep[];
  created_at: string;
}

export interface FunnelStepResult {
  screen: string;
  count: number;
  dropoff: number;
  dropoff_pct: number;
  conversion_pct: number;
}

export interface FunnelResults {
  funnel: Funnel;
  total_sessions: number;
  steps: FunnelStepResult[];
}

export interface CrashGroup {
  message: string;
  filename: string;
  total_occurrences: number;
  affected_sessions: number;
  first_seen: string;
  last_seen: string;
}

export interface Project {
  id:         string;
  name:       string;
  api_key:    string;
  role:       string;
  created_at: string;
}

export interface CrashSession {
  id: string;
  anonymous_id: string;
  external_id: string | null;
  started_at: string;
  duration_ms: number | null;
  device_type: string | null;
  os: string | null;
  crash_elapsed_ms: number;
}

export interface ScreenFlowEdge {
  from_screen:      string;
  to_screen:        string;
  transition_count: number;
}

export interface ScreenFlowNode {
  screen:       string;
  total_visits: number;
  entry_count:  number;
  exit_count:   number;
}

export interface ScreenFlowData {
  edges:             ScreenFlowEdge[];
  nodes:             ScreenFlowNode[];
  total_transitions: number;
}

export interface SegmentFilters {
  device?:      string;
  os?:          string;
  browser?:     string;
  minDuration?: number;   // seconds
  rageClick?:   boolean;
}

export interface Segment {
  id:         string;
  project_id: string;
  name:       string;
  filters:    SegmentFilters;
  created_at: string;
}
