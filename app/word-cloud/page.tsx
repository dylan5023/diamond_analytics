'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import type { WordFrequency } from '@/types'
import { fetcher } from '@/lib/utils'
import WordCloudChart from '@/components/WordCloudChart'
import { FadeIn, FadeInOnScroll } from '@/components/MotionWrapper'

export default function WordCloudPage() {
  const { data: words, error, isLoading } = useSWR<WordFrequency[]>('/api/wordcloud', fetcher)
  const [selectedWord, setSelectedWord] = useState<string | null>(null)

  const handleWordClick = useCallback((word: string) => {
    setSelectedWord(prev => prev === word ? null : word)
  }, [])

  const topWords = words
    ? [...words].sort((a, b) => b.value - a.value).slice(0, 15)
    : []

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <FadeIn>
        <div className="mb-12">
          <h1 className="font-heading text-4xl font-extrabold tracking-tight md:text-5xl">
            Gear Word Cloud
          </h1>
          <p className="mt-3 max-w-lg text-text-secondary">
            Visual frequency map from thousands of baseball gear reviews. 
            Click on any word to highlight it. Updated weekly.
          </p>
        </div>
      </FadeIn>

      {isLoading && (
        <div className="glass-card flex h-[500px] items-center justify-center animate-pulse">
          <div className="text-text-muted">Loading word cloud...</div>
        </div>
      )}

      {error && (
        <div className="glass-card p-8 text-center">
          <p className="text-text-secondary">Failed to load word cloud data. Please try again later.</p>
        </div>
      )}

      {words && (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <FadeInOnScroll>
            <WordCloudChart words={words} onWordClick={handleWordClick} />
          </FadeInOnScroll>

          <FadeInOnScroll delay={0.2}>
            <div className="glass-card p-5">
              <h3 className="mb-4 font-heading text-sm font-bold uppercase tracking-wider text-text-muted">
                Top 15 Keywords
              </h3>
              <div className="space-y-2">
                {topWords.map((word, i) => {
                  const maxValue = topWords[0]?.value ?? 1
                  const percentage = (word.value / maxValue) * 100
                  const isSelected = selectedWord === word.text

                  return (
                    <button
                      key={word.text}
                      onClick={() => handleWordClick(word.text)}
                      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all ${
                        isSelected ? 'bg-accent/15 border border-accent/30' : 'hover:bg-surface'
                      }`}
                    >
                      <span className="w-5 text-right text-[10px] font-medium text-text-muted">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${isSelected ? 'text-accent' : 'text-text-primary'}`}>
                            {word.text}
                          </span>
                          <span className="text-xs tabular-nums text-text-muted">
                            {word.value}
                          </span>
                        </div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface">
                          <div
                            className="h-full rounded-full bg-accent/40 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </FadeInOnScroll>
        </div>
      )}
    </div>
  )
}
