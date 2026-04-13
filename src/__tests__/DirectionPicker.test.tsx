/**
 * DirectionPicker のテスト (Phase 7).
 *
 * 検証目的:
 * 1. 選択ユニットの周囲に 8 個のボタンが描画される
 * 2. ボタンクリックで `SET_DIRECTION` が dispatch され、Probe で direction が変わる
 * 3. 現在 direction のボタンが `aria-pressed="true"` になる
 * 4. selectedUnit が null の状況でピッカーが描画されない
 * 5. 最外 <g> に `data-no-export="true"` が付いている (Phase 9 PNG 出力契約)
 * 6. 最外 <g> は `pointer-events="none"` で、各ボタン <g> は `pointer-events="auto"`
 * 7. キーボード Enter / Space で direction が変わる (a11y)
 * 8. 端配置 (UNIT_COORD_*_MAX 近傍) でも 8 ボタンが DOM 上に存在する
 *
 * Phase 6 / Phase 4 で確立した「BoardProvider でラップ + Probe で state 観測」
 * のパターンを踏襲。
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Board } from '../components/board/Board'
import { DirectionPicker } from '../components/board/DirectionPicker'
import {
  UNIT_COORD_X_MAX,
  UNIT_COORD_Y_MAX,
} from '../constants/board'
import {
  DIRECTION_LABELS,
  DIRECTIONS_8,
  INITIAL_BOARD_STATE,
} from '../constants/game'
import { useBoard, useSelection } from '../state/BoardContext'
import { BoardProvider } from '../state/BoardProvider'
import type { BoardState } from '../types/board'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

/**
 * Probe: 選択中ユニットの direction を data-testid で観測する。
 * BoardProvider 初期 selectedUnit は 'self' (BoardProvider.tsx 参照)。
 */
function Probe() {
  const board = useBoard()
  const { selectedUnit } = useSelection()
  const direction =
    selectedUnit !== null ? board.units[selectedUnit].direction : 'none'
  return (
    <>
      <span data-testid="selected-unit">{selectedUnit ?? 'null'}</span>
      <span data-testid="selected-direction">{String(direction)}</span>
    </>
  )
}

/**
 * 選択ユニットを差し替えるためのコントローラ (テスト用).
 * onClick で `setSelectedUnit('ally')` を呼ぶ。
 */
function SelectAllyButton() {
  const { setSelectedUnit } = useSelection()
  return (
    <button
      type="button"
      data-testid="select-ally"
      onClick={() => setSelectedUnit('ally')}
    >
      ally を選択
    </button>
  )
}

/**
 * 選択を null にするボタン (テスト用).
 */
function ClearSelectionButton() {
  const { setSelectedUnit } = useSelection()
  return (
    <button
      type="button"
      data-testid="clear-selection"
      onClick={() => setSelectedUnit(null)}
    >
      選択解除
    </button>
  )
}

/**
 * テスト用: ピッカーだけを <svg> でラップして render する。
 * Board 全体だと UnitToken のドラッグハンドラやグリッドが入って差分検証が
 * 重くなるので、本テストは DirectionPicker を直接 svg 内に置く構成。
 */
function renderPickerOnly(initialState?: BoardState) {
  return render(
    <BoardProvider initialState={initialState}>
      <svg data-testid="svg-root" viewBox="0 0 720 720">
        <DirectionPicker />
      </svg>
      <Probe />
      <SelectAllyButton />
      <ClearSelectionButton />
    </BoardProvider>,
  )
}

describe('DirectionPicker', () => {
  it('renders 8 direction buttons when a unit is selected', () => {
    renderPickerOnly()
    // role="button" の <g> が 8 個
    const buttons = screen.getAllByRole('button', { name: /に変更$/ })
    expect(buttons).toHaveLength(8)
    // 8 方向すべてのラベルが存在する。文字列指定なら testing-library が
    // 完全一致で照合してくれるため、anchor 付き正規表現は不要。
    for (const direction of DIRECTIONS_8) {
      const btn = screen.getByRole('button', {
        name: `${DIRECTION_LABELS[direction]}に変更`,
      })
      expect(btn).toBeTruthy()
    }
  })

  it('renders nothing when selectedUnit is null', () => {
    renderPickerOnly()
    // 初期は self が選ばれている → ピッカー描画あり
    expect(
      screen.queryAllByRole('button', { name: /に変更$/ }),
    ).toHaveLength(8)

    // 選択解除
    fireEvent.click(screen.getByTestId('clear-selection'))

    // 解除後は 0 件
    expect(
      screen.queryAllByRole('button', { name: /に変更$/ }),
    ).toHaveLength(0)
  })

  it('clicking a direction button dispatches SET_DIRECTION and Probe reflects the new direction', () => {
    renderPickerOnly()
    // 初期 direction (self) は 0
    expect(screen.getByTestId('selected-direction').textContent).toBe('0')
    // 「右向きに変更」ボタンをクリック
    const rightBtn = screen.getByRole('button', { name: '右向きに変更' })
    fireEvent.click(rightBtn)
    expect(screen.getByTestId('selected-direction').textContent).toBe('90')
  })

  it('the current direction button has aria-pressed="true"', () => {
    renderPickerOnly()
    // 初期 direction = 0 (上向き)
    const upBtn = screen.getByRole('button', { name: '上向きに変更' })
    expect(upBtn.getAttribute('aria-pressed')).toBe('true')
    // 他のボタンは false
    const rightBtn = screen.getByRole('button', { name: '右向きに変更' })
    expect(rightBtn.getAttribute('aria-pressed')).toBe('false')

    // 右向きをクリックしたら ARIA も追従
    fireEvent.click(rightBtn)
    expect(rightBtn.getAttribute('aria-pressed')).toBe('true')
    expect(upBtn.getAttribute('aria-pressed')).toBe('false')
  })

  it('the picker root <g> has data-no-export="true" (Phase 9 PNG export contract)', () => {
    const { container } = renderPickerOnly()
    const root = container.querySelector('g[role="group"][aria-label="方向ピッカー"]')
    expect(root).not.toBeNull()
    expect(root!.getAttribute('data-no-export')).toBe('true')
  })

  it('root <g> has pointer-events="none" and each button has pointer-events="auto"', () => {
    const { container } = renderPickerOnly()
    const root = container.querySelector('g[role="group"][aria-label="方向ピッカー"]')
    expect(root!.getAttribute('pointer-events')).toBe('none')
    // 各ボタンは auto に戻されている
    const buttons = container.querySelectorAll('g[role="button"]')
    expect(buttons).toHaveLength(8)
    for (const btn of buttons) {
      expect(btn.getAttribute('pointer-events')).toBe('auto')
    }
  })

  it('Enter key on a focused direction button changes the direction (a11y)', () => {
    renderPickerOnly()
    const downBtn = screen.getByRole('button', { name: '下向きに変更' })
    // happy-dom では <g> の focus は安定しないので、直接 keyDown を発火
    fireEvent.keyDown(downBtn, { key: 'Enter' })
    expect(screen.getByTestId('selected-direction').textContent).toBe('180')
  })

  it('Space key on a focused direction button changes the direction (a11y)', () => {
    renderPickerOnly()
    const leftBtn = screen.getByRole('button', { name: '左向きに変更' })
    fireEvent.keyDown(leftBtn, { key: ' ' })
    expect(screen.getByTestId('selected-direction').textContent).toBe('270')
  })

  it('switching the selected unit moves the picker to the new unit (follows selection)', () => {
    renderPickerOnly()
    // 初期は self が選ばれていて direction=0
    expect(screen.getByTestId('selected-unit').textContent).toBe('self')
    expect(screen.getByTestId('selected-direction').textContent).toBe('0')

    // ally に切り替える
    fireEvent.click(screen.getByTestId('select-ally'))
    expect(screen.getByTestId('selected-unit').textContent).toBe('ally')
    // ally の direction は INITIAL_BOARD_STATE 由来 (0)
    expect(screen.getByTestId('selected-direction').textContent).toBe(
      String(INITIAL_BOARD_STATE.units.ally.direction),
    )

    // 「右向き」をクリックすると ally の direction が変わる
    fireEvent.click(screen.getByRole('button', { name: '右向きに変更' }))
    expect(screen.getByTestId('selected-direction').textContent).toBe('90')
  })

  it('renders all 8 buttons in DOM even when the unit is at the board edge (overflow visible)', () => {
    // self を盤面右下端 (UNIT_COORD_*_MAX 近傍) に置く。
    // ピッカー半径 R=74 がはみ出すが、SVG overflow visible で DOM 上には残る。
    const edgeState: BoardState = {
      ...INITIAL_BOARD_STATE,
      units: {
        ...INITIAL_BOARD_STATE.units,
        self: {
          ...INITIAL_BOARD_STATE.units.self,
          x: Math.floor(UNIT_COORD_X_MAX),
          y: Math.floor(UNIT_COORD_Y_MAX),
        },
      },
    }
    renderPickerOnly(edgeState)
    expect(
      screen.getAllByRole('button', { name: /に変更$/ }),
    ).toHaveLength(8)
  })

  it('Board integrates DirectionPicker so the full svg renders 8 picker buttons', () => {
    // 統合テスト: Board 全体の中で DirectionPicker が描画されることを確認
    const { container } = render(
      <BoardProvider>
        <Board />
      </BoardProvider>,
    )
    expect(
      screen.getAllByRole('button', { name: /に変更$/ }),
    ).toHaveLength(8)
    // Phase 7 レビュー反映: SVG ルートの overflow デフォルトは hidden なので、
    // ピッカーが viewBox 外に出ても見えるよう overflow="visible" を明示している
    // ことをここでロックする (Board.tsx を将来触ったときの早期検知)。
    const svgRoot = container.querySelector('svg[role="img"]')
    expect(svgRoot).not.toBeNull()
    expect(svgRoot!.getAttribute('overflow')).toBe('visible')
  })
})
