/**
 * SVG / Pointer 系プロトタイプスタブの共通ヘルパー (Phase 6 / PR #25 レビュー反映)。
 *
 * 用途:
 * - happy-dom には `SVGSVGElement.createSVGPoint` / `SVGGraphicsElement.getScreenCTM` /
 *   `Element.setPointerCapture` / `releasePointerCapture` の信頼できる実装がない
 * - useDrag を経由する単体・統合テストはこれらが必要なので、prototype に空関数を
 *   先に仕込んでから `vi.spyOn` で実装を差し替える二段構成を取る
 *
 * なぜ二段構成か:
 * - `vi.spyOn` の対象が undefined だと throw するので、最初に Object.defineProperty で
 *   空関数を入れて「spy できる状態」にする必要がある
 * - 実際のテスト実装 (恒等行列スタブ等) は `vi.spyOn` 側で当て、`vi.restoreAllMocks()`
 *   で元 (= 空関数) に戻る → テスト間で漏洩しない
 *
 * `vi.stubGlobal` ではなく `vi.spyOn` を使う理由:
 * - 対象がグローバルではなく `Element.prototype` / `SVGSVGElement.prototype`
 * - testing.md の禁止事項「window.confirm = vi.fn() の直接代入」とは別物
 *
 * 使い方:
 * ```ts
 * import { setupSvgPointerStubs } from './helpers/svgStubs'
 *
 * beforeEach(() => {
 *   setupSvgPointerStubs()
 * })
 *
 * afterEach(() => {
 *   vi.restoreAllMocks()
 * })
 * ```
 */

import { vi } from 'vitest'

/**
 * prototype に空関数を仕込む (1 回だけ実行される初期化フェーズ)。
 * すでに実装が存在する場合は触らない (ブラウザネイティブの動作を尊重)。
 */
function installPrototypeStubs() {
  if (
    typeof (SVGSVGElement.prototype as unknown as { createSVGPoint?: unknown })
      .createSVGPoint !== 'function'
  ) {
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
  if (
    typeof (Element.prototype as unknown as { setPointerCapture?: unknown })
      .setPointerCapture !== 'function'
  ) {
    Object.defineProperty(Element.prototype, 'setPointerCapture', {
      value: function () {},
      configurable: true,
      writable: true,
    })
  }
  if (
    typeof (Element.prototype as unknown as { releasePointerCapture?: unknown })
      .releasePointerCapture !== 'function'
  ) {
    Object.defineProperty(Element.prototype, 'releasePointerCapture', {
      value: function () {},
      configurable: true,
      writable: true,
    })
  }
}

/**
 * 各テスト前に呼ぶセットアップ関数。
 *
 * - prototype に空実装を仕込む (1 回目のみ)
 * - 恒等変換 CTM / createSVGPoint / setPointerCapture / releasePointerCapture を
 *   `vi.spyOn` で差し替える
 *
 * `vi.restoreAllMocks()` を `afterEach` で呼べば、spy の差し替えは元 (= 空関数) に
 * 戻る。defineProperty 自体は restore で消えないが「初期状態 = 空関数」なので
 * 漏洩にはならない。
 *
 * 恒等行列なので clientX/Y がそのまま SVG 座標として扱える → テストで「200, 300」
 * のような値を直接 assert できる。
 */
export function setupSvgPointerStubs() {
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
}
