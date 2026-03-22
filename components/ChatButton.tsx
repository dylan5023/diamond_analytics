'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
}

const SESSION_KEY = 'da_chat_session_id'

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

  const prose = 'text-[15px] leading-[1.7] tracking-[0.01em] text-[#f8f4ea]'

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

  useEffect(() => {
    setSessionId(getOrCreateSessionId())
  }, [])

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

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby="da-chat-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
            className={cn(
              'fixed z-[110] flex max-h-[min(72vh,560px)] w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-navy-card shadow-2xl shadow-black/40',
              'bottom-[5.5rem] right-3 sm:bottom-24 sm:right-6'
            )}
            onClick={e => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-navy-light px-4 py-3">
              <div className="min-w-0">
                <h2 id="da-chat-title" className="font-heading text-base font-bold tracking-tight text-white">
                  Diamond Analytics Assistant
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-primary transition-colors hover:bg-surface-hover hover:text-white"
                aria-label="Close chat"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div
              ref={listRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
            >
              {messages.length === 0 && !loading && (
                <div className="space-y-3 px-0.5">
                  <p className="text-center text-sm text-text-secondary">
                    Try one of these, or type your own question:
                  </p>
                  <ul className="flex flex-col gap-2">
                    {SUGGESTED_QUESTIONS.map(q => (
                      <li key={q}>
                        <button
                          type="button"
                          disabled={loading || !sessionId}
                          onClick={() => onSuggestedQuestion(q)}
                          className="w-full rounded-xl border border-border bg-navy-light/80 px-3 py-2.5 text-left text-xs leading-snug text-text-primary transition-colors hover:border-border-hover hover:bg-surface-hover hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
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
                      'max-w-[88%] rounded-2xl',
                      m.role === 'user'
                        ? 'rounded-br-md bg-accent px-3.5 py-2.5 text-sm font-medium leading-relaxed text-navy'
                        : 'rounded-bl-md border border-border bg-navy-light px-4 py-3.5 shadow-sm'
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
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border bg-navy-light px-4 py-3">
                    <span className="sr-only">Assistant is typing</span>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-accent-light/90 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-accent-light/90 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-accent-light" />
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-border bg-navy-light/80 px-3 pt-2 pb-1">
              <form onSubmit={onSubmit} className="flex gap-2 pb-2">
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
                  rows={1}
                  disabled={loading || !sessionId}
                  className="max-h-32 min-h-[44px] flex-1 resize-y rounded-xl border border-border bg-navy px-3 py-2.5 text-sm text-white placeholder:text-text-secondary focus:border-border-hover focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim() || !sessionId}
                  className="h-11 shrink-0 rounded-xl bg-accent px-4 text-sm font-semibold text-navy transition-colors hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Send
                </button>
              </form>
              <p className="px-1 pb-2 text-center text-[11px] leading-snug text-text-secondary">
                Not affiliated with MLB. Data may be delayed.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className={cn(
          'fixed bottom-6 right-6 z-[120] flex h-14 w-14 items-center justify-center rounded-full',
          'border-2 border-accent/55 bg-navy-card text-accent-light shadow-lg shadow-black/40',
          'transition-[box-shadow,background-color,border-color,color] duration-200',
          'hover:border-accent hover:bg-accent/22 hover:text-white hover:shadow-xl hover:shadow-accent/35',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-navy',
          open && 'border-accent bg-accent/25 text-white shadow-xl shadow-accent/30 ring-2 ring-accent/50 ring-offset-2 ring-offset-navy'
        )}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-current" aria-hidden>
          <path
            d="M12 2C6.48 2 2 6.02 2 11c0 2.35 1.19 4.45 3.05 5.8L4 22l5.45-2.35A9.96 9.96 0 0012 20c5.52 0 10-4.02 10-9S17.52 2 12 2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M8 11h.01M12 11h.01M16 11h.01"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </motion.button>
    </>
  )
}
