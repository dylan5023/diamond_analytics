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
  url: string
  summary: string
  imageUrl: string
  publishedAt: string
}

export interface GameSnapshot {
  id: number
  game_pk: number
  home_team: string
  away_team: string
  home_score: number
  away_score: number
  inning: number
  inning_half: string
  status: string
  win_probability: number
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
