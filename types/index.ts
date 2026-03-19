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
}

export interface PlayerStats {
  id: number
  player_id: number
  full_name: string
  team: string
  position: string
  avg: number
  home_runs: number
  rbi: number
  ops: number
  era: number | null
  whip: number | null
  updated_at: string
}

export interface WordFrequency {
  text: string
  value: number
}

export interface DashboardData {
  games: GameSnapshot[]
  players: PlayerStats[]
}
