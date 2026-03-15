'use client'

import { useEffect, useRef, useCallback } from 'react'
import cloud from 'd3-cloud'
import * as d3 from 'd3'

interface Word {
  text: string
  value: number
  size?: number
}

interface Props {
  words: Word[]
  onWordClick?: (word: string) => void
}

export default function WordCloudChart({ words, onWordClick }: Props) {
  const ref = useRef<SVGSVGElement>(null)

  const draw = useCallback((computedWords: cloud.Word[]) => {
    if (!ref.current) return
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()

    const g = svg
      .attr('viewBox', '0 0 800 500')
      .append('g')
      .attr('transform', 'translate(400,250)')

    g.selectAll('text')
      .data(computedWords)
      .enter()
      .append('text')
      .style('font-size', d => `${d.size}px`)
      .style('font-family', 'var(--font-heading), system-ui, sans-serif')
      .style('font-weight', '700')
      .style('fill', (_, i) => {
        const colors = [
          '#c9a84c', '#e2c97e', '#f5f0e1', '#a88a3a',
          '#d4b85c', '#b89840', '#8b7332', '#dcc580',
          '#c4a24d', '#e8d39b',
        ]
        return colors[i % colors.length]
      })
      .style('cursor', 'pointer')
      .style('opacity', 0)
      .attr('text-anchor', 'middle')
      .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
      .text(d => d.text ?? '')
      .on('click', (_, d) => onWordClick?.(d.text ?? ''))
      .on('mouseover', function () {
        d3.select(this).style('opacity', 0.7).style('filter', 'drop-shadow(0 0 8px rgba(201, 168, 76, 0.5))')
      })
      .on('mouseout', function () {
        d3.select(this).style('opacity', 1).style('filter', 'none')
      })
      .transition()
      .duration(600)
      .delay((_, i) => i * 20)
      .style('opacity', 1)
  }, [onWordClick])

  useEffect(() => {
    if (!ref.current || !words.length) return

    const layout = cloud<Word>()
      .size([800, 500])
      .words(words.map(w => ({ ...w, size: Math.log2(w.value) * 10 + 12 })))
      .padding(6)
      .rotate(() => (Math.random() > 0.7 ? 90 : 0))
      .font('system-ui')
      .fontSize(d => d.size ?? 12)
      .on('end', draw)

    layout.start()
  }, [words, draw])

  return (
    <div className="glass-card overflow-hidden p-4">
      <svg ref={ref} width="100%" className="rounded-xl" />
    </div>
  )
}
