/**
 * useDrag hook の単体テスト。
 *
 * 目的:
 * - PointerDown / Move / Up / Cancel / LostPointerCapture の各経路で
 *   reducer に正しい action が dispatch され、history が期待通りに動くこと
 * - タップ (move なし pointerdown → up) では履歴が積まれず、selection だけ更新されること
 * - pointercancel / lostpointercapture では「開始位置で COMMIT_MOVE」を打って
 *   withHistory の同座標 no-op 分岐に乗り、past を汚さないこと
 *
 * テスト戦略:
 * - SVG / Pointer 系の prototype スタブは src/__tests__/helpers/svgStubs.ts に集約
 *   (PR #25 レビュー指摘 [共通: 中] 反映、Phase 7 以降のドラッグ系テストでも再利用)
 * - 検証は Probe コンポーネント (テストファイル内ローカル定義) で state を観測
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDrag } from '../hooks/useDrag'
import {
  useBoard,
  useBoardHistory,
  useSelection,
} from '../state/BoardContext'
import { BoardProvider } from '../state/BoardProvider'
import type { UnitId } from '../types/board'
import { setupSvgPointerStubs } from './helpers/svgStubs'

/**
 * Probe: state を data-testid で観測する検証用部品 (テストファイル内ローカル定義)。
 *
 * 観測対象:
 * - 自機の x / y 座標 (MOVE_UNIT / COMMIT_MOVE の反映確認)
 * - 選択中ユニット (pointerdown 時の setSelectedUnit 確認)
 * - past / future の長さ (履歴が積まれたか・キャンセルで巻き戻ったか)
 */
function Probe() {
  const board = useBoard()
  const { selectedUnit } = useSelection()
  const { past, future } = useBoardHistory()
  return (
    <>
      <span data-testid="self-x">{board.units.self.x}</span>
      <span data-testid="self-y">{board.units.self.y}</span>
      <span data-testid="enemy1-x">{board.units.enemy1.x}</span>
      <span data-testid="selected">{selectedUnit ?? 'null'}</span>
      <span data-testid="past-len">{past.length}</span>
      <span data-testid="future-len">{future.length}</span>
    </>
  )
}

/**
 * テスト用のドラッグ可能要素。useDrag のハンドラを <g> に貼って、
 * 親 <svg> ルートを `ownerSVGElement` 経由で取れるようにする。
 *
 * 本番の UnitToken と同じ構造 (svg > g) を最小限で再現することで、
 * UnitToken への統合前に hook 単体の挙動を分離検証できる。
 *
 * useDrag は `unit` を引数で受け取る (PR #25 レビュー指摘 [共通: 高] の反映後)
 * ため、Probe を経由せず BoardProvider 内の useBoard で最新の unit を引いて
 * useDrag に渡す。これにより本番の UnitToken と同じデータフローを再現できる。
 */
function DraggableHarness({ unitId }: { unitId: UnitId }) {
  const board = useBoard()
  const unit = board.units[unitId]
  const handlers = useDrag({ unit })
  return (
    <svg width={720} height={720} viewBox="0 0 720 720" data-testid="svg-root">
      <g
        data-testid={`drag-target-${unitId}`}
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerCancel={handlers.onPointerCancel}
        onLostPointerCapture={handlers.onLostPointerCapture}
        style={{ touchAction: 'none' }}
      >
        <circle cx={100} cy={100} r={30} />
      </g>
    </svg>
  )
}

// SVG / Pointer 系 prototype スタブは src/__tests__/helpers/svgStubs.ts に集約
// (PR #25 レビュー指摘 [共通: 中] 反映、Phase 7 以降のドラッグ系テストでも再利用)。
beforeEach(() => {
  setupSvgPointerStubs()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('useDrag', () => {
  describe('drag flow (down → move → up)', () => {
    it('pointerdown → pointermove → pointerup updates self x/y and pushes 1 history entry', () => {
      render(
        <BoardProvider>
          <DraggableHarness unitId="self" />
          <Probe />
        </BoardProvider>,
      )
      const target = screen.getByTestId('drag-target-self')

      // 初期状態: past=0, future=0
      expect(screen.getByTestId('past-len').textContent).toBe('0')

      // 自機の初期 x/y は INITIAL_BOARD_STATE 由来。実数値は assert せず、
      // pointerdown の clientX/Y との関係 (= offset 補正) で最終座標が決まることを検証。
      const initialX = Number(screen.getByTestId('self-x').textContent)
      const initialY = Number(screen.getByTestId('self-y').textContent)

      // pointerdown: 自機中心からの相対オフセットは (initialX - 200, initialY - 200)
      fireEvent.pointerDown(target, {
        pointerId: 1,
        clientX: 200,
        clientY: 200,
      })
      // 単純タップでも selection は更新される (Issue 完了条件 5)
      expect(screen.getByTestId('selected').textContent).toBe('self')

      // pointermove: clientX=300 → ユニット中心は initialX + 100
      fireEvent.pointerMove(target, {
        pointerId: 1,
        clientX: 300,
        clientY: 350,
      })
      expect(Number(screen.getByTestId('self-x').textContent)).toBe(
        initialX + 100,
      )
      expect(Number(screen.getByTestId('self-y').textContent)).toBe(
        initialY + 150,
      )
      // MOVE_UNIT は履歴に積まれない (ドラッグ中)
      expect(screen.getByTestId('past-len').textContent).toBe('0')

      // pointerup: COMMIT_MOVE で 1 履歴
      fireEvent.pointerUp(target, {
        pointerId: 1,
        clientX: 300,
        clientY: 350,
      })
      expect(screen.getByTestId('past-len').textContent).toBe('1')
    })

    it('multiple pointermove events accumulate into a single COMMIT_MOVE history entry', () => {
      render(
        <BoardProvider>
          <DraggableHarness unitId="self" />
          <Probe />
        </BoardProvider>,
      )
      const target = screen.getByTestId('drag-target-self')

      fireEvent.pointerDown(target, {
        pointerId: 1,
        clientX: 200,
        clientY: 200,
      })
      // 5 回 move しても history は積まれない
      for (let i = 0; i < 5; i++) {
        fireEvent.pointerMove(target, {
          pointerId: 1,
          clientX: 200 + i * 10,
          clientY: 200 + i * 10,
        })
      }
      expect(screen.getByTestId('past-len').textContent).toBe('0')

      fireEvent.pointerUp(target, {
        pointerId: 1,
        clientX: 240,
        clientY: 240,
      })
      // ドラッグ後の history は 1 件だけ
      expect(screen.getByTestId('past-len').textContent).toBe('1')
    })
  })

  describe('tap (no move) does not push history', () => {
    it('pointerdown → pointerup with no move updates selection only', () => {
      render(
        <BoardProvider>
          <DraggableHarness unitId="enemy1" />
          <Probe />
        </BoardProvider>,
      )
      const target = screen.getByTestId('drag-target-enemy1')

      // 「BoardProvider の初期 selectedUnit が何か」には依存しない relative 検証
      // (BoardProvider.tsx を将来触ったらテストが壊れる暗黙依存を断つ)。
      // タップ前は enemy1 が選択されていないことだけを前提とし、タップで
      // enemy1 に切り替わることを差で検証する。
      const selectedBefore = screen.getByTestId('selected').textContent
      // 前提: タップ前は enemy1 が選択されていない
      // (この assert が落ちたら「初期 selection が enemy1 になった」の意味なので
      //  別のユニット (例: 'ally') でテストし直すこと)
      expect(selectedBefore).not.toBe('enemy1')
      const initialX = Number(screen.getByTestId('enemy1-x').textContent)

      fireEvent.pointerDown(target, {
        pointerId: 1,
        clientX: 200,
        clientY: 200,
      })
      // タップだけでは MOVE_UNIT は発火しない
      fireEvent.pointerUp(target, {
        pointerId: 1,
        clientX: 200,
        clientY: 200,
      })

      // タップ後は必ず enemy1 が選択されている (selectedBefore とは別物のはず)
      expect(screen.getByTestId('selected').textContent).toBe('enemy1')
      expect(screen.getByTestId('selected').textContent).not.toBe(selectedBefore)
      // 座標は変化なし (= 元の参照のまま)
      expect(Number(screen.getByTestId('enemy1-x').textContent)).toBe(initialX)
      // 履歴は積まれない
      expect(screen.getByTestId('past-len').textContent).toBe('0')
    })
  })

  describe('cancel paths (pointercancel / lostpointercapture)', () => {
    it('pointercancel after move snaps back to start position without history', () => {
      render(
        <BoardProvider>
          <DraggableHarness unitId="self" />
          <Probe />
        </BoardProvider>,
      )
      const target = screen.getByTestId('drag-target-self')
      const initialX = Number(screen.getByTestId('self-x').textContent)
      const initialY = Number(screen.getByTestId('self-y').textContent)

      fireEvent.pointerDown(target, {
        pointerId: 1,
        clientX: 200,
        clientY: 200,
      })
      fireEvent.pointerMove(target, {
        pointerId: 1,
        clientX: 350,
        clientY: 400,
      })
      // ドラッグ中は present が動いている
      expect(Number(screen.getByTestId('self-x').textContent)).not.toBe(
        initialX,
      )

      fireEvent.pointerCancel(target, { pointerId: 1 })

      // snapback: 開始位置に戻る
      expect(Number(screen.getByTestId('self-x').textContent)).toBe(initialX)
      expect(Number(screen.getByTestId('self-y').textContent)).toBe(initialY)
      // history は汚れない (withHistory の同座標 no-op 分岐)
      expect(screen.getByTestId('past-len').textContent).toBe('0')
    })

    it('lostpointercapture also routes through snapback', () => {
      render(
        <BoardProvider>
          <DraggableHarness unitId="self" />
          <Probe />
        </BoardProvider>,
      )
      const target = screen.getByTestId('drag-target-self')
      const initialX = Number(screen.getByTestId('self-x').textContent)

      fireEvent.pointerDown(target, {
        pointerId: 1,
        clientX: 200,
        clientY: 200,
      })
      fireEvent.pointerMove(target, {
        pointerId: 1,
        clientX: 350,
        clientY: 400,
      })

      // lostpointercapture (alert 等で capture が剥がれるケース)
      fireEvent.lostPointerCapture(target, { pointerId: 1 })

      expect(Number(screen.getByTestId('self-x').textContent)).toBe(initialX)
      expect(screen.getByTestId('past-len').textContent).toBe('0')
    })
  })

  describe('multitouch protection', () => {
    it('ignores pointermove from a different pointerId', () => {
      render(
        <BoardProvider>
          <DraggableHarness unitId="self" />
          <Probe />
        </BoardProvider>,
      )
      const target = screen.getByTestId('drag-target-self')
      const initialX = Number(screen.getByTestId('self-x').textContent)

      fireEvent.pointerDown(target, {
        pointerId: 1,
        clientX: 200,
        clientY: 200,
      })
      // 別の指 (pointerId=2) からの move は無視される
      fireEvent.pointerMove(target, {
        pointerId: 2,
        clientX: 500,
        clientY: 500,
      })
      expect(Number(screen.getByTestId('self-x').textContent)).toBe(initialX)

      // pointerId=1 の move は通る
      fireEvent.pointerMove(target, {
        pointerId: 1,
        clientX: 300,
        clientY: 300,
      })
      expect(Number(screen.getByTestId('self-x').textContent)).not.toBe(
        initialX,
      )
    })

    it('ignores second pointerdown while a session is active', () => {
      render(
        <BoardProvider>
          <DraggableHarness unitId="self" />
          <Probe />
        </BoardProvider>,
      )
      const target = screen.getByTestId('drag-target-self')

      fireEvent.pointerDown(target, {
        pointerId: 1,
        clientX: 200,
        clientY: 200,
      })
      // 2 本目の指
      fireEvent.pointerDown(target, {
        pointerId: 2,
        clientX: 400,
        clientY: 400,
      })

      // pointerId=1 の up を打って 1 履歴を確定
      fireEvent.pointerMove(target, {
        pointerId: 1,
        clientX: 250,
        clientY: 250,
      })
      fireEvent.pointerUp(target, {
        pointerId: 1,
        clientX: 250,
        clientY: 250,
      })

      // 2 本目の pointerdown は完全無視されているはず → 履歴は 1 件
      expect(screen.getByTestId('past-len').textContent).toBe('1')
    })
  })
})
