import { NextRequest, NextResponse } from 'next/server'

const DIRECT_KEYS = [
  'response',
  'text',
  'output',
  'message',
  'answer',
  'reply',
  'content',
  'result',
] as const

/** n8n often wraps items as { json: { ... } } or [{ json: { ... } }]. */
function unwrapN8nShape(parsed: unknown): unknown {
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return parsed
    return unwrapN8nShape(parsed[0])
  }
  if (parsed && typeof parsed === 'object' && 'json' in parsed) {
    const inner = (parsed as { json: unknown }).json
    if (inner !== undefined) return unwrapN8nShape(inner)
  }
  return parsed
}

function extractOpenAiChoices(o: Record<string, unknown>): string | null {
  const choices = o.choices
  if (!Array.isArray(choices) || choices.length === 0) return null
  const first = choices[0] as Record<string, unknown>
  const msg = first?.message
  if (msg && typeof msg === 'object') {
    const content = (msg as { content?: unknown }).content
    if (typeof content === 'string' && content.trim()) return content.trim()
  }
  if (typeof first?.text === 'string' && first.text.trim()) return first.text.trim()
  return null
}

function extractFromParsed(parsed: unknown): string | null {
  if (parsed == null) return null

  if (typeof parsed === 'string') {
    const t = parsed.trim()
    if (
      (t.startsWith('{') && t.endsWith('}')) ||
      (t.startsWith('[') && t.endsWith(']'))
    ) {
      try {
        return extractFromParsed(JSON.parse(t))
      } catch {
        return t.length ? t : null
      }
    }
    return t.length ? t : null
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return null
    return extractFromParsed(parsed[0])
  }

  if (typeof parsed === 'object') {
    const root = unwrapN8nShape(parsed) as Record<string, unknown> | unknown
    if (root == null || typeof root !== 'object') {
      return extractFromParsed(root)
    }
    const o = root as Record<string, unknown>

    const fromChoices = extractOpenAiChoices(o)
    if (fromChoices) return fromChoices

    for (const k of DIRECT_KEYS) {
      const v = o[k]
      if (typeof v === 'string' && v.trim()) return v.trim()
      if (typeof v === 'number' || typeof v === 'boolean') return String(v)
      if (k === 'message' && v && typeof v === 'object') {
        const msg = v as Record<string, unknown>
        if (typeof msg.content === 'string' && msg.content.trim()) return msg.content.trim()
        const inner = extractFromParsed(v)
        if (inner) return inner
      }
      if ((k === 'output' || k === 'result') && v && typeof v === 'object') {
        const inner = extractFromParsed(v)
        if (inner) return inner
      }
    }

    if (o.data != null) {
      const inner = extractFromParsed(o.data)
      if (inner) return inner
    }
    if (o.body != null) {
      const inner = extractFromParsed(o.body)
      if (inner) return inner
    }
  }

  return null
}

function collectLeafStrings(v: unknown, depth: number, acc: string[]): void {
  if (depth > 14) return
  if (typeof v === 'string') {
    const t = v.trim()
    if (t) acc.push(t)
    return
  }
  if (Array.isArray(v)) {
    for (const x of v) collectLeafStrings(x, depth + 1, acc)
    return
  }
  if (v && typeof v === 'object') {
    for (const x of Object.values(v)) collectLeafStrings(x, depth + 1, acc)
  }
}

function isJunkString(s: string): boolean {
  if (s.length < 2) return true
  if (/^chatcmpl-[a-z0-9-]+$/i.test(s)) return true
  if (/^[0-9a-f-]{36}$/i.test(s)) return true
  if (/^(assistant|user|system)$/i.test(s)) return true
  return false
}

/** Last resort: longest plausible string in the JSON tree (handles odd n8n shapes). */
function pickBestLeafString(parsed: unknown): string | null {
  const acc: string[] = []
  collectLeafStrings(parsed, 0, acc)
  const filtered = acc.filter(s => !isJunkString(s))
  if (filtered.length === 0) return null
  const prose = filtered.filter(s => /\s/.test(s) || s.length > 60)
  const pool = prose.length ? prose : filtered
  return pool.reduce((a, b) => (a.length >= b.length ? a : b))
}

/** n8n "Respond to Webhook" — JSON, plain text, n8n item wrapper, or OpenAI-style payloads. */
function parseN8nAssistantBody(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const first = trimmed[0]
  if (first !== '{' && first !== '[') {
    if (trimmed.length > 32000) return trimmed.slice(0, 32000)
    return trimmed
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed) as unknown
  } catch {
    return null
  }

  const structured = extractFromParsed(parsed)
  if (structured) return structured

  const fallback = pickBestLeafString(parsed)
  return fallback
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body?.message
    const session_id = body?.session_id

    if (typeof message !== 'string' || typeof session_id !== 'string') {
      return NextResponse.json({ error: 'Invalid body: message and session_id are required' }, { status: 400 })
    }

    const trimmed = message.trim()
    if (!trimmed) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }

    const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ error: 'Chat webhook is not configured' }, { status: 500 })
    }

    const chatApiKey = process.env.N8N_WEBHOOK_CHAT_KEY?.trim()
    if (!chatApiKey) {
      return NextResponse.json({ error: 'Chat webhook authentication is not configured' }, { status: 500 })
    }

    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': chatApiKey,
      },
      body: JSON.stringify({ message: trimmed, session_id }),
    })

    const rawBody = await upstream.text().catch(() => '')

    if (!upstream.ok) {
      console.error('n8n chat webhook error:', upstream.status, rawBody.slice(0, 500))
      const dev = process.env.NODE_ENV === 'development'
      const hint = dev ? ` (n8n returned HTTP ${upstream.status})` : ''
      return NextResponse.json(
        {
          error: `Assistant service unavailable${hint}`,
          ...(dev && rawBody.trim() ? { upstreamPreview: rawBody.trim().slice(0, 200) } : {}),
        },
        { status: 502 }
      )
    }

    const responseText = parseN8nAssistantBody(rawBody)
    if (responseText == null) {
      const dev = process.env.NODE_ENV === 'development'
      console.error('n8n chat: could not parse body (first 500 chars):', rawBody.slice(0, 500))
      return NextResponse.json(
        {
          error: dev
            ? 'Empty or unreadable reply from n8n. In "Respond to Webhook", return JSON with assistant text (e.g. {"response":"..."}) or plain text.'
            : 'Invalid response from assistant',
          ...(dev && rawBody.trim() ? { upstreamPreview: rawBody.trim().slice(0, 400) } : {}),
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ response: responseText })
  } catch (e) {
    console.error('chat route error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
