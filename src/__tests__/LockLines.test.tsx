/**
 * LockLines 統合テスト (Phase 8)。
 *
 * 検証目的:
 * 1. lockTarget を設定すると SVG に <line> が描画される
 * 2. lockTarget を null にすると <line> が消える
 * 3. 複数ユニットが同時にロックしている場合に正しい本数が描画される
 * 4. ロック線グループに pointerEvents="none" と aria-hidden="true" が付いている
 *
 * 幾何計算の詳細は lockLineGeometry.test.ts で検証済みなので、
 * ここでは「state 変更 → 線が出る/消える」の統合だけ薄く確認する。
 */

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Board } from '../components/board/Board'
import { BoardProvider } from '../state/BoardProvider'
import { INITIAL_BOARD_STATE } from '../constants/game'
import type { BoardState, UnitId } from '../types/board'
import { setupSvgPointerStubs } from './helpers/svgStubs'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/** lockTarget を設定した初期状態を作るヘルパー */
function stateWith(
  overrides: Partial<Record<UnitId, { lockTarget: UnitId | null }>>,
): BoardState {
  const state = structuredClone(INITIAL_BOARD_STATE)
  for (const [id, patch] of Object.entries(overrides)) {
    const unit = state.units[id as UnitId]
    if (unit && patch) {
      unit.lockTarget = patch.lockTarget
    }
  }
  return state
}

/**
 * BoardProvider に initialState を渡して Board をレンダリングするヘルパー。
 * BoardProvider は LOAD_STATE で初期化する。
 */
function renderBoard(initialState?: BoardState) {
  // svgStubs が必要 (UnitToken のドラッグ系が SVG メソッドを使うため)
  setupSvgPointerStubs()

  const result = render(
    <BoardProvider initialState={initialState}>
      <Board />
    </BoardProvider>,
  )

  return result
}

/** SVG 内のロック線 <line> 要素を取得 (marker-end に lock-arrow を持つもの) */
function getLockLines(container: HTMLElement): SVGLineElement[] {
  return Array.from(container.querySelectorAll('line[marker-end*="lock-arrow"]'))
}

describe('LockLines 統合テスト', () => {
  it('lockTarget が null の場合、line 要素は描画されない', () => {
    const { container } = renderBoard()

    expect(getLockLines(container)).toHaveLength(0)
  })

  it('self → enemy1 にロックを設定すると line が 1 本描画される', () => {
    const state = stateWith({ self: { lockTarget: 'enemy1' } })
    const { container } = renderBoard(state)

    const lines = getLockLines(container)
    expect(lines).toHaveLength(1)
    expect(lines[0].getAttribute('marker-end')).toContain('lock-arrow-ally')
  })

  it('enemy1 → self にロックを設定すると赤い line が描画される', () => {
    const state = stateWith({ enemy1: { lockTarget: 'self' } })
    const { container } = renderBoard(state)

    const lines = getLockLines(container)
    expect(lines).toHaveLength(1)
    expect(lines[0].getAttribute('marker-end')).toContain('lock-arrow-enemy')
  })

  it('4 ユニット全てがロックすると line が 4 本描画される', () => {
    const state = stateWith({
      self: { lockTarget: 'enemy1' },
      ally: { lockTarget: 'enemy2' },
      enemy1: { lockTarget: 'self' },
      enemy2: { lockTarget: 'ally' },
    })
    const { container } = renderBoard(state)

    expect(getLockLines(container)).toHaveLength(4)
  })

  it('ロック線グループに pointerEvents="none" と aria-hidden="true" が付いている', () => {
    const state = stateWith({ self: { lockTarget: 'enemy1' } })
    const { container } = renderBoard(state)

    const lines = getLockLines(container)
    expect(lines).toHaveLength(1)

    // <line> の親 <g> を取得
    const group = lines[0].parentElement
    expect(group?.getAttribute('pointer-events')).toBe('none')
    expect(group?.getAttribute('aria-hidden')).toBe('true')
  })
})
