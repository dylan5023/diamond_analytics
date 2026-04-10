'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sendGAEvent } from '@next/third-parties/google'
import { cn } from '@/lib/utils'

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
}

const SESSION_KEY = 'da_chat_session_id'
const PANEL_OFFSET_KEY = 'da_chat_panel_offset'
const FAB_OFFSET_KEY = 'da_chat_fab_offset'

function readStoredPanelOffset(): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 0, y: 0 }
  try {
    const raw = sessionStorage.getItem(PANEL_OFFSET_KEY)
    if (!raw) return { x: 0, y: 0 }
    const p = JSON.parse(raw) as { x?: unknown; y?: unknown }
    const x = Number(p.x)
    const y = Number(p.y)
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  } catch {
    /* ignore */
  }
  return { x: 0, y: 0 }
}

function readStoredFabOffset(): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 0, y: 0 }
  try {
    const raw = sessionStorage.getItem(FAB_OFFSET_KEY)
    if (!raw) return { x: 0, y: 0 }
    const p = JSON.parse(raw) as { x?: unknown; y?: unknown }
    const x = Number(p.x)
    const y = Number(p.y)
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  } catch {
    /* ignore */
  }
  return { x: 0, y: 0 }
}

function clampPanelOffset(x: number, y: number): { x: number; y: number } {
  if (typeof window === 'undefined') return { x, y }
  const maxX = Math.min(480, window.innerWidth * 0.55)
  const maxY = Math.min(400, window.innerHeight * 0.5)
  return {
    x: Math.min(96, Math.max(-maxX, x)),
    y: Math.min(160, Math.max(-maxY, y)),
  }
}

function clampFabOffset(x: number, y: number): { x: number; y: number } {
  if (typeof window === 'undefined') return { x, y }
  const maxX = Math.min(560, window.innerWidth * 0.8)
  const maxY = Math.min(560, window.innerHeight * 0.8)
  return {
    x: Math.min(140, Math.max(-maxX, x)),
    y: Math.min(160, Math.max(-maxY, y)),
  }
}

const SUGGESTED_QUESTIONS = [
  'What features does Diamond Analytics offer?',
  'How do I use the MLB Live page?',
  'What stats can I find on the Player Dashboard?',
  'Where does the blog content come from?',
  'What does OPS mean in baseball?',
] as const

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

/** Long assistant replies: break into readable blocks (paragraphs or sentences). */
function AssistantMessageBody({ content }: { content: string }) {
  const trimmed = content.trim()
  if (!trimmed) return null

  const prose = 'text-[16px] leading-[1.75] tracking-[0.01em] text-[#f8f4ea]'

  if (/\n\s*\n/.test(trimmed)) {
    const paras = trimmed.split(/\n\s*\n/).filter(Boolean)
    return (
      <div className={cn('space-y-3', prose)}>
        {paras.map((p, i) => (
          <p key={i} className="whitespace-pre-wrap break-words">
            {p.trim()}
          </p>
        ))}
      </div>
    )
  }

  if (trimmed.length > 420) {
    const sentences = trimmed.split(/(?<=[.!?])\s+(?=[A-Z(0-9"'])/u).filter(s => s.trim().length > 0)
    if (sentences.length > 2) {
      return (
        <div className={cn('space-y-2.5', prose)}>
          {sentences.map((s, i) => (
            <p key={i} className="break-words hyphens-auto">
              {s.trim()}
            </p>
          ))}
        </div>
      )
    }
  }

  return <div className={cn('whitespace-pre-wrap break-words hyphens-auto', prose)}>{trimmed}</div>
}

export default function ChatButton() {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelDragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)
  const panelOffsetRef = useRef({ x: 0, y: 0 })
  const fabDragRef = useRef<{ originX: number; originY: number; ox: number; oy: number } | null>(null)
  const fabOffsetRef = useRef({ x: 0, y: 0 })
  const fabPointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const suppressFabClickRef = useRef(false)

  const [panelOffset, setPanelOffset] = useState({ x: 0, y: 0 })
  const [panelDragging, setPanelDragging] = useState(false)
  const [fabOffset, setFabOffset] = useState({ x: 0, y: 0 })
  const [fabDragging, setFabDragging] = useState(false)

  useEffect(() => {
    setSessionId(getOrCreateSessionId())
    setPanelOffset(readStoredPanelOffset())
    setFabOffset(readStoredFabOffset())
  }, [])

  useEffect(() => {
    panelOffsetRef.current = panelOffset
  }, [panelOffset])

  useEffect(() => {
    fabOffsetRef.current = fabOffset
  }, [fabOffset])

  const onPanelHeaderPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    panelDragRef.current = {
      px: e.clientX,
      py: e.clientY,
      ox: panelOffsetRef.current.x,
      oy: panelOffsetRef.current.y,
    }
    setPanelDragging(true)
  }

  const onPanelHeaderPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = panelDragRef.current
    if (!d) return
    const nx = d.ox + (e.clientX - d.px)
    const ny = d.oy + (e.clientY - d.py)
    const next = clampPanelOffset(nx, ny)
    panelOffsetRef.current = next
    setPanelOffset(next)
  }

  const onPanelHeaderPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (!panelDragRef.current) return
    panelDragRef.current = null
    setPanelDragging(false)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    try {
      sessionStorage.setItem(PANEL_OFFSET_KEY, JSON.stringify(panelOffsetRef.current))
    } catch {
      /* ignore */
    }
  }

  const onPanelHeaderPointerCancel = (e: React.PointerEvent<HTMLElement>) => {
    onPanelHeaderPointerUp(e)
  }

  const FAB_DRAG_THRESHOLD_PX = 10

  const onFabPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (open) return
    fabPointerStartRef.current = { x: e.clientX, y: e.clientY }
    fabDragRef.current = null
    ;(e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId)
  }

  const onFabPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (open) return
    const start = fabPointerStartRef.current
    if (!start) return

    if (!fabDragRef.current) {
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (dx * dx + dy * dy < FAB_DRAG_THRESHOLD_PX * FAB_DRAG_THRESHOLD_PX) return
      fabDragRef.current = {
        originX: e.clientX,
        originY: e.clientY,
        ox: fabOffsetRef.current.x,
        oy: fabOffsetRef.current.y,
      }
      setFabDragging(true)
    }

    const d = fabDragRef.current
    if (!d) return
    const nx = d.ox + (e.clientX - d.originX)
    const ny = d.oy + (e.clientY - d.originY)
    const next = clampFabOffset(nx, ny)
    fabOffsetRef.current = next
    setFabOffset(next)
  }

  const onFabPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (open) {
      fabPointerStartRef.current = null
      return
    }
    const wasDragging = fabDragRef.current != null
    fabDragRef.current = null
    fabPointerStartRef.current = null
    setFabDragging(false)
    try {
      ;(e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    if (wasDragging) {
      suppressFabClickRef.current = true
      try {
        sessionStorage.setItem(FAB_OFFSET_KEY, JSON.stringify(fabOffsetRef.current))
      } catch {
        /* ignore */
      }
    }
  }

  const onFabPointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    onFabPointerUp(e)
  }

  const onFabClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (suppressFabClickRef.current) {
      suppressFabClickRef.current = false
      e.preventDefault()
      return
    }
    setOpen(v => {
      if (!v) sendGAEvent('event', 'chatbot_open', { source: 'fab_button' })
      return !v
    })
  }

  const scrollToBottom = useCallback(() => {
    const el = listRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, open, scrollToBottom])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 100)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const runChat = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || !sessionId) return

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, session_id: sessionId }),
      })
      const data = (await res.json()) as {
        response?: string
        error?: string
        upstreamPreview?: string
      }

      if (!res.ok) {
        const errParts = [data.error, data.upstreamPreview].filter(Boolean)
        setMessages(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: errParts.length ? errParts.join('\n\n') : 'Something went wrong. Please try again.',
          },
        ])
        return
      }

      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.response ?? '',
        },
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Network error. Check your connection and try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading || !sessionId) return
    setInput('')
    await runChat(text)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void send()
  }

  const onSuggestedQuestion = (q: string) => {
    if (loading || !sessionId) return
    setInput('')
    void runChat(q)
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-navy/70 backdrop-blur-sm"
            aria-hidden
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <div
        className="fixed bottom-6 right-6 z-[120] flex flex-col-reverse items-end gap-3"
        style={{
          transform: `translate3d(${fabOffset.x}px, ${fabOffset.y}px, 0)`,
          willChange: fabDragging ? 'transform' : undefined,
        }}
      >
        <motion.button
          type="button"
          onClick={onFabClick}
          onPointerDown={onFabPointerDown}
          onPointerMove={onFabPointerMove}
          onPointerUp={onFabPointerUp}
          onPointerCancel={onFabPointerCancel}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-full',
            'border-2 border-accent/55 bg-navy-card text-accent-light shadow-lg shadow-black/40',
            'transition-[box-shadow,background-color,border-color,color] duration-200',
            'hover:border-accent hover:bg-accent/22 hover:text-white hover:shadow-xl hover:shadow-accent/35',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-navy',
            open && 'cursor-default',
            !open && 'touch-none select-none',
            !open && !fabDragging && 'cursor-grab',
            fabDragging && 'cursor-grabbing',
            open && 'border-accent bg-accent/25 text-white shadow-xl shadow-accent/30 ring-2 ring-accent/50 ring-offset-2 ring-offset-navy'
          )}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={
            open ? 'Close assistant' : 'Open assistant — when chat is closed, drag to move this button'
          }
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="text-current" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.65" />
            <path
              d="M 7.5 4.2 Q 12 12 7.5 19.8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 16.5 4.2 Q 12 12 16.5 19.8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7.92 6.66L9.25 6.11 M8.69 9.04L10.09 8.72 M9.02 11.41L10.45 11.34 M9.02 12.59L10.45 12.66 M8.91 13.77L10.33 13.97 M8.36 16.15L9.73 16.59 M7.66 17.94L8.96 18.54 M14.75 6.11L16.08 6.66 M13.91 8.72L15.31 9.04 M13.55 11.34L14.98 11.41 M13.55 12.66L14.98 12.59 M13.67 13.97L15.09 13.77 M14.27 16.59L15.64 16.15 M15.04 18.54L16.34 17.94"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              key="da-chat-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto w-[calc(100vw-1.25rem)] max-w-lg shrink-0"
            >
              <div
                id={panelId}
                role="dialog"
                aria-modal="true"
                aria-labelledby="da-chat-title"
                style={{ transform: `translate3d(${panelOffset.x}px, ${panelOffset.y}px, 0)` }}
                className={cn(
                  'relative flex min-h-0 max-h-[min(82vh,680px)] w-full flex-col overflow-hidden rounded-2xl border border-border bg-navy-card shadow-2xl shadow-black/40',
                  panelDragging && 'will-change-transform'
                )}
                onClick={e => e.stopPropagation()}
              >
            <header className="flex shrink-0 items-center gap-2 border-b border-border bg-navy-light px-3 py-3 sm:px-5 sm:py-4">
              <div
                role="presentation"
                onPointerDown={onPanelHeaderPointerDown}
                onPointerMove={onPanelHeaderPointerMove}
                onPointerUp={onPanelHeaderPointerUp}
                onPointerCancel={onPanelHeaderPointerCancel}
                className={cn(
                  'flex min-w-0 flex-1 cursor-grab items-center gap-3 rounded-lg px-2 py-1.5 touch-none select-none active:cursor-grabbing',
                  'hover:bg-white/[0.04]'
                )}
              >
                <span className="flex shrink-0 flex-col gap-1" aria-hidden>
                  <span className="flex gap-1">
                    <span className="h-1 w-1 rounded-full bg-text-secondary/70" />
                    <span className="h-1 w-1 rounded-full bg-text-secondary/70" />
                    <span className="h-1 w-1 rounded-full bg-text-secondary/70" />
                  </span>
                  <span className="flex gap-1">
                    <span className="h-1 w-1 rounded-full bg-text-secondary/70" />
                    <span className="h-1 w-1 rounded-full bg-text-secondary/70" />
                    <span className="h-1 w-1 rounded-full bg-text-secondary/70" />
                  </span>
                </span>
                <div className="min-w-0">
                  <h2 id="da-chat-title" className="font-heading text-lg font-bold tracking-tight text-white">
                    Diamond Analytics Assistant
                  </h2>
                  <p className="sr-only">
                    Drag the header, side rails, or bottom strip to move the chat window. The launcher button stays fixed while chat is open.
                  </p>
                  <p className="mt-0.5 text-[10px] text-text-secondary/90 sm:text-xs">Drag header, sides, or bottom bar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-primary transition-colors hover:bg-surface-hover hover:text-white"
                aria-label="Close chat"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-row">
              <div
                role="presentation"
                title="Drag to move"
                className={cn(
                  'w-4 shrink-0 cursor-grab touch-none select-none self-stretch border-r border-white/[0.06] active:cursor-grabbing sm:w-5',
                  'hover:bg-white/[0.05]'
                )}
                onPointerDown={onPanelHeaderPointerDown}
                onPointerMove={onPanelHeaderPointerMove}
                onPointerUp={onPanelHeaderPointerUp}
                onPointerCancel={onPanelHeaderPointerCancel}
              >
                <span className="sr-only">Drag left side to move chat</span>
              </div>
              <div
                ref={listRef}
                className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4"
              >
              {messages.length === 0 && !loading && (
                <div className="space-y-4 px-0.5">
                  <p className="text-center text-base text-text-secondary">
                    Try one of these, or type your own question:
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {SUGGESTED_QUESTIONS.map(q => (
                      <li key={q}>
                        <button
                          type="button"
                          disabled={loading || !sessionId}
                          onClick={() => onSuggestedQuestion(q)}
                          className="w-full rounded-xl border border-border bg-navy-light/80 px-4 py-3 text-left text-sm leading-snug text-text-primary transition-colors hover:border-border-hover hover:bg-surface-hover hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
                        >
                          {q}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {messages.map(m => (
                <div
                  key={m.id}
                  className={cn('flex w-full', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[90%] rounded-2xl',
                      m.role === 'user'
                        ? 'rounded-br-md bg-accent px-4 py-3 text-base font-medium leading-relaxed text-navy'
                        : 'rounded-bl-md border border-border bg-navy-light px-5 py-4 shadow-sm'
                    )}
                  >
                    {m.role === 'assistant' ? (
                      <AssistantMessageBody content={m.content} />
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-navy-light px-5 py-4">
                    <span className="sr-only">Assistant is typing</span>
                    <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-accent-light/90 [animation-delay:-0.3s]" />
                    <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-accent-light/90 [animation-delay:-0.15s]" />
                    <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-accent-light" />
                  </div>
                </div>
              )}
              </div>
              <div
                role="presentation"
                title="Drag to move"
                className={cn(
                  'w-4 shrink-0 cursor-grab touch-none select-none self-stretch border-l border-white/[0.06] active:cursor-grabbing sm:w-5',
                  'hover:bg-white/[0.05]'
                )}
                onPointerDown={onPanelHeaderPointerDown}
                onPointerMove={onPanelHeaderPointerMove}
                onPointerUp={onPanelHeaderPointerUp}
                onPointerCancel={onPanelHeaderPointerCancel}
              >
                <span className="sr-only">Drag right side to move chat</span>
              </div>
            </div>

            <div className="shrink-0 border-t border-border bg-navy-light/80">
              <div
                role="presentation"
                title="Drag to move"
                className={cn(
                  'flex h-4 cursor-grab touch-none select-none items-center justify-center gap-1 border-b border-white/[0.06] active:cursor-grabbing sm:h-5',
                  'hover:bg-white/[0.05]'
                )}
                onPointerDown={onPanelHeaderPointerDown}
                onPointerMove={onPanelHeaderPointerMove}
                onPointerUp={onPanelHeaderPointerUp}
                onPointerCancel={onPanelHeaderPointerCancel}
              >
                <span className="sr-only">Drag bottom bar to move chat</span>
                <span className="h-1 w-6 rounded-full bg-text-secondary/40" aria-hidden />
              </div>
              <div className="px-4 pt-3 pb-2">
                <form onSubmit={onSubmit} className="flex gap-2.5 pb-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void send()
                      }
                    }}
                    placeholder="Type a message…"
                    rows={2}
                    disabled={loading || !sessionId}
                    className="max-h-40 min-h-[52px] flex-1 resize-y rounded-xl border border-border bg-navy px-4 py-3 text-base text-white placeholder:text-text-secondary focus:border-border-hover focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim() || !sessionId}
                    className="h-12 min-w-[5.5rem] shrink-0 self-end rounded-xl bg-accent px-5 text-base font-semibold text-navy transition-colors hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>
                <p className="px-1 pb-2 text-center text-xs leading-snug text-text-secondary">
                  Not affiliated with MLB. Data may be delayed.
                </p>
              </div>
            </div>
            </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
