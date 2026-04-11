/**
 * Board 統合テスト (Phase 6 / Issue #7)。
 *
 * useDrag の単体テストは src/__tests__/useDrag.test.tsx で網羅しているため、
 * ここでは「Board をまるごと render したときに、UnitToken の <g> が
 * 正しく useDrag のハンドラを受け取って dispatch まで貫通しているか」だけを
 * 1 ケースのスモークで確認する。
 *
 * <g> 要素の取得方針 (testing.md と整合):
 * - data-testid を本体に入れない (「本体ツリーを汚染しない」方針)
 * - 既存の <title>{label}</title> から `parentElement` で <g> を取り出す
 *   (<title> はスクリーンリーダー対応のために元々あるもの。テスト用追加属性ではない)
 *
 * SVG プロトタイプスタブの理由は useDrag.test.tsx の冒頭コメント参照
 * (happy-dom には createSVGPoint / setPointerCapture の信頼できる実装がないため)。
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// `screen` を使うので import を残す (Probe 経由の data-testid 取得で使用)

import { Board } from '../components/board/Board'
import { useBoard, useBoardHistory } from '../state/BoardContext'
import { BoardProvider } from '../state/BoardProvider'

function Probe() {
  const board = useBoard()
  const { past } = useBoardHistory()
  return (
    <>
      <span data-testid="self-x">{board.units.self.x}</span>
      <span data-testid="self-y">{board.units.self.y}</span>
      <span data-testid="past-len">{past.length}</span>
    </>
  )
}

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
  vi.spyOn(SVGSVGElement.prototype, 'createSVGPoint').mockImplementation(
    function () {
      return {
        x: 0,
        y: 0,
        matrixTransform(this: { x: number; y: number }) {
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

describe('Board drag integration', () => {
  it('dragging the self unit token via Board updates self coordinates and pushes 1 history entry', () => {
    const { container } = render(
      <BoardProvider>
        <Board />
        <Probe />
      </BoardProvider>,
    )

    // 「自機」というテキストは <title> (a11y) と名前ピル <tspan> の両方に出るので、
    // <title> 要素に限定して取り出す。<title> はスクリーンリーダー向けに元々あるもので、
    // テスト用の追加属性ではないため testing.md の方針 (本体ツリー無汚染) と整合する。
    const titles = container.querySelectorAll('title')
    const selfTitle = Array.from(titles).find((t) => t.textContent === '自機')
    expect(selfTitle).toBeTruthy()
    const group = selfTitle!.parentElement
    expect(group).not.toBeNull()
    expect(group?.tagName.toLowerCase()).toBe('g')

    expect(screen.getByTestId('past-len').textContent).toBe('0')
    const initialX = Number(screen.getByTestId('self-x').textContent)
    const initialY = Number(screen.getByTestId('self-y').textContent)

    // pointerdown → pointermove → pointerup
    // clientX/Y は恒等 CTM スタブのおかげで SVG 座標として扱われる
    fireEvent.pointerDown(group!, {
      pointerId: 1,
      clientX: 200,
      clientY: 200,
    })
    fireEvent.pointerMove(group!, {
      pointerId: 1,
      clientX: 320,
      clientY: 290,
    })
    fireEvent.pointerUp(group!, {
      pointerId: 1,
      clientX: 320,
      clientY: 290,
    })

    // ユニット中心は「初期値 + (clientX 差分)」分動く (offset 補正で指追従)
    expect(Number(screen.getByTestId('self-x').textContent)).toBe(
      initialX + 120,
    )
    expect(Number(screen.getByTestId('self-y').textContent)).toBe(
      initialY + 90,
    )
    expect(screen.getByTestId('past-len').textContent).toBe('1')
  })
})
