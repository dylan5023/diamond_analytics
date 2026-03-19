import type { GameSnapshot } from './index'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      game_snapshots: {
        Row: GameSnapshot
        Insert: Omit<GameSnapshot, 'id'>
        Update: Partial<GameSnapshot>
      }
    }
  }
}
