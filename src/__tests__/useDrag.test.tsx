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
 * - happy-dom には SVGGraphicsElement.getScreenCTM の信頼できる実装がないため、
 *   `vi.spyOn(SVGGraphicsElement.prototype, 'getScreenCTM')` で恒等行列スタブに差し替える
 *   → clientX/Y がそのまま SVG 座標になるので、検証しやすい
 * - setPointerCapture / releasePointerCapture も happy-dom に存在しないので spy で no-op に
 * - 検証は Probe コンポーネント (テストファイル内ローカル定義) で state を観測
 *
 * `vi.stubGlobal` ではなく `vi.spyOn` を使うのは、対象がグローバルではなく
 * `Element.prototype` / `SVGGraphicsElement.prototype` だから (testing.md の禁止事項とは別物)。
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
 */
function DraggableHarness({ unitId }: { unitId: UnitId }) {
  const handlers = useDrag({ unitId })
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

/**
 * happy-dom には createSVGPoint / setPointerCapture / releasePointerCapture が
 * 実装されていない (or matrixTransform を返さない) ので、prototype に空関数を
 * 仕込んでから vi.spyOn で実装を当てる。
 *
 * `vi.spyOn` の対象が undefined だと throw するため、先に no-op を defineProperty
 * しておくのがミソ。afterEach の `vi.restoreAllMocks()` で空関数の状態に戻り、
 * テスト間で漏洩しない (= testing.md の禁止事項である「直接代入による漏洩」とは別物)。
 */
function installPrototypeStubs() {
  if (typeof (SVGSVGElement.prototype as unknown as { createSVGPoint?: unknown }).createSVGPoint !== 'function') {
    Object.defineProperty(SVGSVGElement.prototype, 'createSVGPoint', {
      value: function () {
        return {
          x: 0,
          y: 0,
          matrixTransform(this: { x: number; y: number }) {
            return { x: this.x, y: this.y }
          },
        }
      },
      configurable: true,
      writable: true,
    })
  }
  if (typeof (Element.prototype as unknown as { setPointerCapture?: unknown }).setPointerCapture !== 'function') {
    Object.defineProperty(Element.prototype, 'setPointerCapture', {
      value: function () {},
      configurable: true,
      writable: true,
    })
  }
  if (typeof (Element.prototype as unknown as { releasePointerCapture?: unknown }).releasePointerCapture !== 'function') {
    Object.defineProperty(Element.prototype, 'releasePointerCapture', {
      value: function () {},
      configurable: true,
      writable: true,
    })
  }
}

beforeEach(() => {
  installPrototypeStubs()

  // 恒等変換 CTM。pt.matrixTransform は (恒等なら) pt.x/y をそのまま返すように
  // createSVGPoint スタブで実装している。getScreenCTM 自体は inverse() の存在だけ
  // 担保すれば良い。
  vi.spyOn(SVGGraphicsElement.prototype, 'getScreenCTM').mockImplementation(
    function () {
      return {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: 0,
        f: 0,
        inverse() {
          return this
        },
      } as unknown as DOMMatrix
    },
  )

  // createSVGPoint も上書きして、毎回新しいオブジェクトを返すように
  // (テスト間で同じインスタンスが共有されないように)
  vi.spyOn(SVGSVGElement.prototype, 'createSVGPoint').mockImplementation(
    function () {
      return {
        x: 0,
        y: 0,
        matrixTransform(this: { x: number; y: number }) {
          // 恒等行列前提: pt.x/y をそのまま返す
          return { x: this.x, y: this.y } as DOMPoint
        },
      } as unknown as DOMPoint
    },
  )

  vi.spyOn(Element.prototype, 'setPointerCapture').mockImplementation(
    () => {},
  )
  vi.spyOn(Element.prototype, 'releasePointerCapture').mockImplementation(
    () => {},
  )
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

      // 初期 selectedUnit は 'self' (BoardProvider のデフォルト)
      expect(screen.getByTestId('selected').textContent).toBe('self')
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

      // 選択は enemy1 に切り替わる
      expect(screen.getByTestId('selected').textContent).toBe('enemy1')
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
