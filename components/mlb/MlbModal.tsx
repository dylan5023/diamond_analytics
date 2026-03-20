'use client'

import { useEffect } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
  /** Stacked on top of another modal */
  stacked?: boolean
}

export default function MlbModal({ title, onClose, children, wide, stacked }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${stacked ? 'z-[110]' : 'z-[100]'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mlb-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div
        className={`relative z-10 max-h-[92vh] w-full overflow-hidden rounded-2xl border border-white/[0.12] shadow-2xl shadow-black/40 ${
          wide ? 'max-w-6xl' : 'max-w-lg'
        }`}
        style={{ backgroundColor: '#1a1f2e' }}
        onClick={e => e.stopPropagation()}
        role="presentation"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.1] px-6 py-5">
          <h2
            id="mlb-modal-title"
            className="font-heading text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2.5 text-[#94a3b8] transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[calc(90vh-5rem)] overflow-y-auto px-6 py-6 text-[15px] leading-relaxed text-slate-200">
          {children}
        </div>
      </div>
    </div>
  )
}
