export interface BlogPost {
  id: string
  title: string
  slug: string
  summary: string
  contents: string
  category: string
  imageUrl: string
  publishedAt: string
  published: boolean
}

export interface NewsArticle {
  title: string
  html: string
  date: string
  category: string
  rank: number
  image_thumbnail: string
  url: string
  information_density: number
  information_density_reasoning: string
  trend_score: number
  trend_reasoning: string
  utility_score: number
  utility_reasoning: string
  total_score: number
}

export interface GameSnapshot {
  id?: number
  game_pk: number
  home_team: string
  away_team: string
  home_score: number
  away_score: number
  inning: number
  inning_half: string
  status: string
  win_probability: number
  home_wins?: number
  home_losses?: number
  away_wins?: number
  away_losses?: number
  home_pitcher?: string | null
  away_pitcher?: string | null
  home_era?: number | null
  away_era?: number | null
  home_whip?: number | null
  away_whip?: number | null
  home_win_pct?: number | null
  away_win_pct?: number | null
  win_pct_diff?: number | null
  score_diff?: number | null
  game_date?: string | null
  updated_at: string
  home_team_id?: number | null
  away_team_id?: number | null
}

export interface PlayerStats {
  id: number
  player_id: number
  full_name: string
  /** Usually team_abbr from team_rosters */
  team: string
  /** Full club name when available */
  team_name?: string | null
  position: string
  avg: number
  /** Hitting (optional; from player_stats when joined) */
  obp?: number | null
  slg?: number | null
  hits?: number | null
  home_runs: number
  rbi: number
  ops: number
  era: number | null
  whip: number | null
  /** Pitching (optional) */
  wins?: number | null
  losses?: number | null
  updated_at: string
  /** Hitting qualifiers / display */
  at_bats?: number | null
  /** Pitching qualifiers / display */
  innings_pitched?: number | null
  strikeouts?: number | null
}

/** /dashboard — 2025 qualified leaderboards from player_stats + team_rosters */
export interface DashboardLeaderboards {
  season: number
  minHitterAb: number
  minPitcherIp: number
  topN: number
  hitters: {
    byHomeRuns: PlayerStats[]
    byAvg: PlayerStats[]
    byOps: PlayerStats[]
  }
  pitchers: {
    byEra: PlayerStats[]
    byStrikeouts: PlayerStats[]
    byWhip: PlayerStats[]
  }
}

export interface WordFrequency {
  text: string
  value: number
}

export interface PlayerSearchResult {
  player_id: number
  full_name: string
  team: string
  position: string
  hitting: {
    avg: number
    ops: number
    home_runs: number
    rbi: number
  } | null
  pitching: {
    era: number | null
    whip: number | null
  } | null
}

/** Season snapshot for dashboard charts (from `player_stats` + `team_rosters`). */
export interface PlayerChartProfile {
  season: number
  full_name: string
  team: string
  position: string
  hitting: {
    avg: number
    obp: number | null
    slg: number | null
    ops: number
    home_runs: number
    rbi: number
    hits: number | null
    at_bats: number | null
  } | null
  pitching: {
    era: number | null
    whip: number | null
    strikeouts: number | null
    innings_pitched: number | null
    wins: number | null
    losses: number | null
  } | null
}

/** Qualified-player season means for chart comparison (green line). */
export interface SeasonLeagueAverages {
  hitting: {
    avg: number
    obp: number
    slg: number
    ops: number
    home_runs: number
    rbi: number
    hits: number
    at_bats: number
  } | null
  pitching: {
    era: number
    whip: number
    strikeouts: number
    innings_pitched: number
    wins: number
    losses: number
  } | null
}

export interface DashboardData {
  games: GameSnapshot[]
  leaderboards: DashboardLeaderboards
  /** Deduped union of leaderboard rows for legacy consumers */
  players?: PlayerStats[]
}
