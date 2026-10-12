const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  getRaces: (season?: number) =>
    apiFetch<RaceListResponse>(`/api/races${season ? `?season=${season}` : ''}`),
  getRaceOverview: (raceId: number) =>
    apiFetch<RaceOverview>(`/api/races/${raceId}/overview`),
  getSessionLaps: (sessionId: number) =>
    apiFetch<LapsResponse>(`/api/sessions/${sessionId}/laps`),
  getTelemetryCompare: (params: TelemetryCompareParams) =>
    apiFetch<TelemetryCompareResponse>(`/api/telemetry/compare?${new URLSearchParams(params as unknown as Record<string, string>)}`),
  getPredictions: (raceId: number, cutoff: 'pre_weekend' | 'post_qualifying') =>
    apiFetch<PredictionsResponse>(`/api/races/${raceId}/predictions?cutoff=${cutoff}`),
  getDriverStandings: (season?: number) =>
    apiFetch<DriverStandingsResponse>(`/api/standings/drivers${season ? `?season=${season}` : ''}`),
  getConstructorStandings: (season?: number) =>
    apiFetch<ConstructorStandingsResponse>(`/api/standings/constructors${season ? `?season=${season}` : ''}`),
  getUpcomingRaces: () =>
    apiFetch<UpcomingRacesResponse>(`/api/races/upcoming`),
  getSessionDrivers: (sessionId: number) =>
    apiFetch<SessionDriversResponse>(`/api/sessions/${sessionId}/drivers`),
  getDashboardInsights: (season?: number) =>
    apiFetch<DashboardInsightsResponse>(`/api/analytics/dashboard_insights${season ? `?season=${season}` : ''}`),
  getHeadToHead: (driverA: string, driverB: string, season?: number) =>
    apiFetch<HeadToHeadResponse>(`/api/analytics/head_to_head?driver_a=${driverA}&driver_b=${driverB}${season ? `&season=${season}` : ''}`),
  getPitStops: (season?: number) =>
    apiFetch<PitStopsResponse>(`/api/analytics/pit_stops${season ? `?season=${season}` : ''}`),
  getSeasonCharts: (season?: number) =>
    apiFetch<SeasonChartsResponse>(`/api/analytics/season_charts${season ? `?season=${season}` : ''}`),
  getDriverProfile: (driverCode: string, season?: number) =>
    apiFetch<DriverProfileResponse>(`/api/analytics/driver_profile?driver_code=${driverCode}${season ? `&season=${season}` : ''}`),
  sendChat: (message: string, context?: ChatContext) =>
    apiFetch<ChatResponse>(`/api/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    }),
};

// Types
export interface Race {
  id: number;
  season: number;
  round: number;
  name: string;
  date: string;
  status?: string;
  circuit: { name: string; country: string; city: string };
}

export interface RaceListResponse { races: Race[]; total: number }

export interface DriverResult {
  driver_id: number;
  driver_name: string;
  driver_code: string;
  team_name: string;
  final_position: number | null;
  points: number;
  status: string;
  qualifying_position: number | null;
  gap_to_pole_ms: number | null;
}

export interface RaceOverview {
  race: Race;
  results: DriverResult[];
  sessions: Array<{ id: number; session_type: string; status: string }>;
  has_telemetry: boolean;
}

export interface LapsResponse {
  session_id: number;
  laps: Array<{
    driver_code: string;
    lap_number: number;
    lap_time_ms: number;
    compound: string;
    tyre_age: number;
    position: number;
    is_pit_lap: boolean;
  }>;
}

export interface TelemetryCompareParams {
  session_id: string;
  driver_a: string;
  lap_a: string;
  driver_b: string;
  lap_b: string;
}

export interface TelemetryCompareResponse {
  session_id: string;
  laps: Array<{
    driver_id: string;
    lap_number: number;
    lap_time_ms: number;
    compound: string;
  }>;
  distance_m: number[];
  speed_kph: Record<string, number[]>;
  throttle: Record<string, number[]>;
  brake: Record<string, number[]>;
  gear: Record<string, number[]>;
  drs: Record<string, number[]>;
  delta_ms: number[];
  quality_flags: string[];
}

export interface DriverPrediction {
  driver_id: number;
  driver_name: string;
  driver_code: string;
  team_name: string;
  probability: number;
  qualifying_position: number | null;
  key_factors: Array<{ name: string; value: number | string; direction: 'positive' | 'negative' | 'neutral' }>;
  model_version: string;
  cutoff_time: string;
}

export interface PredictionsResponse {
  race: Race;
  cutoff_type: string;
  predictions: DriverPrediction[];
  model_metrics: { brier_score: number; log_loss: number; calibration_note: string };
}

export interface ChatContext {
  race_id?: number;
  session_id?: number;
  driver_ids?: number[];
}

export interface ChatSourceSchema {
  type: string;
  id: number | string;
  label: string;
  url?: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSourceSchema[];
  functions_called: string[];
}

export interface DriverStanding {
  rank: number;
  driver_id: number;
  driver_name: string;
  driver_code: string;
  nationality: string | null;
  team_name: string;
  points: number;
  gap_to_leader?: number;
  evolution?: number;
  wins: number;
  podiums: number;
}

export interface DriverStandingsResponse {
  season: number;
  standings: DriverStanding[];
}

export interface ConstructorStanding {
  rank: number;
  constructor_id: number;
  team_name: string;
  nationality: string | null;
  points: number;
  wins: number;
  podiums: number;
}

export interface ConstructorStandingsResponse {
  season: number;
  standings: ConstructorStanding[];
}

export interface UpcomingRaceItem {
  id: number;
  season: number;
  round: number;
  name: string;
  date: string | null;
  status: string;
  circuit_name: string | null;
  country: string | null;
  city: string | null;
}

export interface UpcomingRacesResponse {
  recent: UpcomingRaceItem[];
  upcoming: UpcomingRaceItem[];
}

export interface SessionDriver {
  id: number;
  name: string;
  code: string;
  team: string;
}

export interface SessionDriversResponse {
  session_id: number;
  drivers: SessionDriver[];
}

export interface DashboardInsightsResponse {
  season: number;
  season_completed_pct: number;
  total_rounds: number;
  completed_rounds: number;
  fastest_pit_stop: {
    duration_s: number;
    driver_name: string;
    driver_code: string;
    team_name: string | null;
    race_name: string;
    round: number;
  };
  incidents_dnfs: number;
  estimated_damage_cost: number;
  telemetry_laps_analyzed: number;
  top_driver: { name: string; code: string; points: number } | null;
  top_constructor: { name: string; points: number } | null;
}

export interface HeadToHeadDriver {
  driver_id: number;
  full_name: string;
  code: string;
  nationality: string | null;
  team: string;
  races: number;
  points: number;
  wins: number;
  podiums: number;
  poles: number;
  avg_finish: number | null;
  avg_quali: number | null;
  dnfs: number;
}

export interface HeadToHeadResponse {
  season: number;
  driver_a: HeadToHeadDriver;
  driver_b: HeadToHeadDriver;
  race_duel: { driver_a_ahead: number; driver_b_ahead: number };
  quali_duel: { driver_a_ahead: number; driver_b_ahead: number };
}

export interface PitStopItem {
  rank: number;
  duration_s: number;
  driver_name: string;
  driver_code: string;
  team_name: string;
  race_name: string;
  round: number;
  lap: number;
  stop_number: number;
}

export interface TeamPitStopRanking {
  rank: number;
  team_name: string;
  total_stops: number;
  avg_duration_s: number;
  fastest_s: number;
}

export interface PitStopsResponse {
  season: number;
  fastest_stops: PitStopItem[];
  team_rankings: TeamPitStopRanking[];
}

export interface SeasonWinner {
  round: number;
  race_name: string;
  driver_name: string;
  driver_code: string;
  team_name: string;
}

export interface SeasonConstructor {
  name: string;
  points: number;
  wins: number;
  podiums: number;
}

export interface SeasonChartsResponse {
  season: number;
  top_driver_codes: string[];
  all_driver_codes?: string[];
  round_meta?: Array<{ round: number; name: string; country: string; flag: string }>;
  points_progression: Array<Record<string, any>>;
  ranking_progression?: Array<Record<string, any>>;
  winners: SeasonWinner[];
  constructors: SeasonConstructor[];
}

export interface DriverProfileResponse {
  season: number;
  driver: {
    id: number;
    full_name: string;
    code: string;
    nationality: string | null;
    team_name: string;
    car_number: number;
  };
  kpis: {
    wins: number;
    sprint_wins: number;
    podiums: number;
    sprint_podiums: number;
    points: number;
    avg_points: number;
    laps_led: number;
    races_entered: number;
  };
  radial_gauge: {
    wins_pct: number;
    podiums_pct: number;
    points_pct: number;
    dnf_pct: number;
  };
  finishes_donut: {
    in_points: number;
    out_of_points: number;
    dnf: number;
    points_finish_pct: number;
  };
  positions_distribution: Record<string, number>;
  points_vs_previous: Array<{
    round: string;
    [year: string]: number | string | null;
  }>;
  sps: {
    score: number;
    grade: string;
    championship: number;
    qualifying: number;
    racecraft: number;
    reliability: number;
  };
  tms: {
    score: number;
    grade: string;
    teammate_code: string;
    race_h2h: string;
    quali_h2h: string;
  };
}
