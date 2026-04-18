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
