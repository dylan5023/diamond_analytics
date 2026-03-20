import { NextResponse } from 'next/server'
import { searchPlayers } from '@/lib/dashboard-data'

export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  try {
    const results = await searchPlayers(q)
    return NextResponse.json({ results })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Search failed'
    return NextResponse.json({ error: message, results: [] }, { status: 500 })
  }
}
