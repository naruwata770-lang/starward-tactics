/**
 * Layout のスロット契約テスト (Issue #84 追加)。
 *
 * 4 slot (toolbar / board / costBar / inspector) がそれぞれ期待する祖先
 * (header / main / main / aside) 配下に入ることを検証する。
 *
 * なぜこのテストが必要か:
 * - Issue #60 で TeamCostBar を Toolbar slot 内で束ねていた実装を、Issue #84 で
 *   `costBar` slot に分離した。将来「残コスト表示を Toolbar に戻したい」系の
 *   差し戻し提案が来たとき、Toolbar 配下に TeamCostBar が復帰すると本テストが
 *   失敗して Layout の責務境界 (操作 UI は Toolbar、state summary は costBar) を
 *   機械的に守れる
 * - Inspector 位置 (aside) も Issue #84 の「desktop は board 列寄せ、aside に
 *   costBar を並べない」決定を縛る
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Layout } from '../components/Layout'

afterEach(() => {
  cleanup()
})

describe('Layout slot 契約', () => {
  function renderWithSlots() {
    return render(
      <Layout
        toolbar={<span data-testid="slot-toolbar">toolbar-content</span>}
        board={<span data-testid="slot-board">board-content</span>}
        costBar={<span data-testid="slot-cost-bar">cost-bar-content</span>}
        inspector={<span data-testid="slot-inspector">inspector-content</span>}
      />,
    )
  }

  it('4 slot をすべて描画する', () => {
    renderWithSlots()
    expect(screen.getByTestId('slot-toolbar')).toBeTruthy()
    expect(screen.getByTestId('slot-board')).toBeTruthy()
    expect(screen.getByTestId('slot-cost-bar')).toBeTruthy()
    expect(screen.getByTestId('slot-inspector')).toBeTruthy()
  })

  it('toolbar slot は header 配下に配置される', () => {
    const { container } = renderWithSlots()
    const toolbar = screen.getByTestId('slot-toolbar')
    const header = container.querySelector('header')
    expect(header).not.toBeNull()
    expect(header?.contains(toolbar)).toBe(true)
  })

  it('board slot は main 配下に配置される', () => {
    const { container } = renderWithSlots()
    const board = screen.getByTestId('slot-board')
    const main = container.querySelector('main')
    expect(main).not.toBeNull()
    expect(main?.contains(board)).toBe(true)
  })

  it('costBar slot は main 配下に配置され、board と同じ main に入る (Issue #84)', () => {
    const { container } = renderWithSlots()
    const board = screen.getByTestId('slot-board')
    const costBar = screen.getByTestId('slot-cost-bar')
    const main = container.querySelector('main')
    expect(main).not.toBeNull()
    // Issue #84: board と costBar は同じ main 内で視覚的に隣接させる
    expect(main?.contains(board)).toBe(true)
    expect(main?.contains(costBar)).toBe(true)
  })

  it('costBar slot は Toolbar (header) 配下には入らない (Issue #60 巻き戻し固定)', () => {
    const { container } = renderWithSlots()
    const costBar = screen.getByTestId('slot-cost-bar')
    const header = container.querySelector('header')
    expect(header).not.toBeNull()
    // Issue #60 では Toolbar slot 内で束ねていたが、Issue #84 で分離した。
    // 差し戻し防止ガード。
    expect(header?.contains(costBar)).toBe(false)
  })

  it('costBar slot は aside 配下には入らない (desktop board 列寄せ固定)', () => {
    const { container } = renderWithSlots()
    const costBar = screen.getByTestId('slot-cost-bar')
    const aside = container.querySelector('aside')
    expect(aside).not.toBeNull()
    expect(aside?.contains(costBar)).toBe(false)
  })

  it('inspector slot は aside 配下に配置される', () => {
    const { container } = renderWithSlots()
    const inspector = screen.getByTestId('slot-inspector')
    const aside = container.querySelector('aside')
    expect(aside).not.toBeNull()
    expect(aside?.contains(inspector)).toBe(true)
  })
})

/**
 * Issue #86: short viewport で aside が main を縦に stretch する問題を解消する
 * ため、outer の高さ戦略と flex 子要素の min-h-0 契約を class token 単位で固定
 * する。
 *
 * jsdom/happy-dom はレイアウト計算をしない (svh の解釈・scrollbar 出現・overflow
 * 発火は検証不可) ので、ここでは **Tailwind class token の存在** だけを担保する。
 * 実際の挙動確認は docs/uxaudit/iteration-4/ で手動 viewport 検証に寄せる。
 *
 * Token 単位で検証する (className 完全一致にしない) 理由: Tailwind の生成順は
 * 意味に影響しないので、順序変更で brittle に落ちないようにする (Codex レビュー
 * 指摘反映)。
 */
describe('Layout 高さ戦略 (Issue #86)', () => {
  function renderWithSlots() {
    return render(
      <Layout
        toolbar={<span data-testid="slot-toolbar">toolbar-content</span>}
        board={<span data-testid="slot-board">board-content</span>}
        costBar={<span data-testid="slot-cost-bar">cost-bar-content</span>}
        inspector={<span data-testid="slot-inspector">inspector-content</span>}
      />,
    )
  }

  /** ある element が指定した class token をすべて持つか */
  function hasTokens(el: Element | null, tokens: string[]): boolean {
    if (!el) return false
    const classes = new Set(el.className.split(/\s+/).filter(Boolean))
    return tokens.every((t) => classes.has(t))
  }

  it('outer は min-h-svh と lg:h-svh を両方持つ (1 カラム: page scroll / 2 カラム: viewport lock)', () => {
    const { container } = renderWithSlots()
    const outer = container.firstElementChild
    // Issue #86: lg 未満は従来通り page-level scroll (min-h-svh)、
    // lg 以上 (2 カラム) は aside 内部 scroll のため viewport lock (lg:h-svh)
    expect(hasTokens(outer, ['min-h-svh', 'lg:h-svh'])).toBe(true)
  })

  it('content row (header/footer の間) に flex-1 / min-h-0 / flex-col / lg:flex-row が揃う', () => {
    const { container } = renderWithSlots()
    const main = container.querySelector('main')
    // main の親がまさに content row
    const contentRow = main?.parentElement ?? null
    expect(contentRow).not.toBeNull()
    // Issue #86: flex 子要素に高さ拘束を伝えるため min-h-0 が必要。
    // flex-col/lg:flex-row で narrow vs desktop のカラム切替を担保
    expect(hasTokens(contentRow, ['flex-1', 'min-h-0', 'flex-col', 'lg:flex-row'])).toBe(true)
  })

  it('main に flex-1 / min-h-0 / items-start が揃う', () => {
    const { container } = renderWithSlots()
    const main = container.querySelector('main')
    // Issue #84 で items-start を採用 (cost bar viewport 外落下の防止)。
    // Issue #86 で min-h-0 を token 単位で固定 (flex 高さ拘束の伝播)
    expect(hasTokens(main, ['flex-1', 'min-h-0', 'items-start'])).toBe(true)
  })

  it('aside に min-h-0 / overflow-y-auto / lg:w-80 が揃う', () => {
    const { container } = renderWithSlots()
    const aside = container.querySelector('aside')
    // Issue #86: 2 カラム時 aside が内部スクロールするには min-h-0 + overflow-y-auto が必須。
    // lg:w-80 は desktop 2 カラムレイアウトの幅契約 (Inspector 320px)
    expect(hasTokens(aside, ['min-h-0', 'overflow-y-auto', 'lg:w-80'])).toBe(true)
  })
})
