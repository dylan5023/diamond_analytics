/** Extended game row — IDs optional if not in DB yet */
export interface GameSnapshotExtended {
  home_team_id?: number | null
  away_team_id?: number | null
}

export interface TeamRosterRow {
  player_id: number
  team_id: number
  team_name?: string | null
  team_abbr?: string | null
  full_name: string
  position?: string | null
  position_type?: string | null
  jersey_number?: number | null
  bats?: string | null
  throws?: string | null
  birth_date?: string | null
  height?: string | null
  weight?: string | null
  status?: string | null
}

export interface PlayerSeasonStatRow {
  player_id: number
  season: number
  stat_group: 'hitting' | 'pitching' | string
  avg?: number | null
  obp?: number | null
  slg?: number | null
  ops?: number | null
  at_bats?: number | null
  hits?: number | null
  home_runs?: number | null
  rbi?: number | null
  stolen_bases?: number | null
  strikeouts?: number | null
  walks?: number | null
  era?: number | null
  whip?: number | null
  wins?: number | null
  losses?: number | null
  saves?: number | null
  innings_pitched?: number | null
  bb?: number | null
  k9?: number | null
  bb9?: number | null
}

/** One inning cell in `game_linescores.innings` jsonb */
export interface GameLinescoreInning {
  num?: number | null
  home?: number | null
  away?: number | null
}

export interface GameLinescoreRow {
  game_pk: number
  game_date?: string | null
  home_team: string
  away_team: string
  innings: GameLinescoreInning[] | null
  home_runs?: number | null
  away_runs?: number | null
  home_hits?: number | null
  away_hits?: number | null
  home_errors?: number | null
  away_errors?: number | null
  winner_name?: string | null
  loser_name?: string | null
  save_name?: string | null
}

export interface GameBoxscoreRow {
  game_pk: number
  game_date?: string | null
  player_id: number
  team_id: number
  stat_group: 'hitting' | 'pitching' | string
  at_bats?: number | null
  hits?: number | null
  home_runs?: number | null
  rbi?: number | null
  stolen_bases?: number | null
  walks?: number | null
  avg?: number | null
  strikeouts?: number | null
  innings_pitched?: number | null
  earned_runs?: number | null
  era?: number | null
}
