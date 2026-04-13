/**
 * TeamCostBar のテスト (Issue #60)。
 *
 * SVG 出力は属性ベースなので、描画結果を DOM 属性経由で検証する
 * (PNG 出力時に外部 CSS が解決されない制約への回帰検知を兼ねる)。
 */

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TeamCostBar } from '../components/board/TeamCostBar'
import { BoardProvider } from '../state/BoardProvider'
import type { BoardState } from '../types/board'
import { INITIAL_BOARD_STATE } from '../constants/game'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function renderBar(state: BoardState = INITIAL_BOARD_STATE) {
  return render(
    <BoardProvider initialState={state}>
      <TeamCostBar />
    </BoardProvider>,
  )
}

describe('TeamCostBar', () => {
  it('renders labels for both teams with formatted value x.x/6.0', () => {
    const state: BoardState = {
      ...INITIAL_BOARD_STATE,
      teamRemainingCost: { ally: 4.5, enemy: 3 },
    }
    const { container } = renderBar(state)
    const texts = Array.from(container.querySelectorAll('text')).map(
      (t) => t.textContent ?? '',
    )
    expect(texts).toContain('味方')
    expect(texts).toContain('敵')
    expect(texts).toContain('4.5/6.0')
    expect(texts).toContain('3.0/6.0')
  })

  it('has aria-labels matching each team and its value', () => {
    const state: BoardState = {
      ...INITIAL_BOARD_STATE,
      teamRemainingCost: { ally: 5, enemy: 0.5 },
    }
    const { container } = renderBar(state)
    const groups = container.querySelectorAll('g[role="group"]')
    const labels = Array.from(groups).map((g) => g.getAttribute('aria-label'))
    expect(labels).toContain('味方残コスト 5.0/6.0')
    expect(labels).toContain('敵残コスト 0.5/6.0')
  })

  it('hides the filled rect when the value is 0 (Issue #60: empty state)', () => {
    const state: BoardState = {
      ...INITIAL_BOARD_STATE,
      teamRemainingCost: { ally: 0, enemy: 6 },
    }
    const { container } = renderBar(state)
    // rect は bg track + (value > 0 のときだけ) fill。ally は 0 なので fill は 1 つ減る
    const rects = container.querySelectorAll('rect')
    // track (ally) + track (enemy) + fill (enemy) の 3 枚
    expect(rects).toHaveLength(3)
  })

  it('uses attribute-based fill colors (no Tailwind classes) for PNG safety', () => {
    const state: BoardState = {
      ...INITIAL_BOARD_STATE,
      teamRemainingCost: { ally: 5, enemy: 2 },
    }
    const { container } = renderBar(state)
    const rects = container.querySelectorAll('rect')
    for (const rect of Array.from(rects)) {
      const fill = rect.getAttribute('fill')
      expect(fill).toMatch(/^#[0-9a-fA-F]{3,8}$/)
    }
  })

  it('carries the export-target id so PNG composition can locate it', () => {
    const { container } = renderBar()
    expect(container.querySelector('#team-cost-bar-svg')).not.toBeNull()
  })
})
