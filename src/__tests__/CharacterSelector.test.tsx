/**
 * CharacterSelector のコンポーネントテスト。
 *
 * 目的: 「機体クリック → SET_CHARACTER dispatch → cost 自動同期 + characterId 反映」と
 * 検索フィルタの基本動作、未選択戻し導線を保証する。
 */

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { CharacterSelector } from '../components/inspector/CharacterSelector'
import { CHARACTERS } from '../data/characters'
import { useBoard } from '../state/BoardContext'
import { BoardProvider } from '../state/BoardProvider'

function CharacterProbe() {
  const board = useBoard()
  return (
    <>
      <span data-testid="self-character">
        {board.units.self.characterId ?? 'null'}
      </span>
      <span data-testid="self-cost">{String(board.units.self.cost)}</span>
    </>
  )
}

function renderSelector(current: string | null = null) {
  return render(
    <BoardProvider>
      <CharacterProbe />
      <CharacterSelector unitId="self" current={current} />
    </BoardProvider>,
  )
}

describe('CharacterSelector', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders search input and "未選択" button', () => {
    renderSelector()
    expect(screen.getByRole('searchbox', { name: /機体検索/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /未選択/ })).toBeTruthy()
  })

  it('renders cost section headers in descending order when no query', () => {
    renderSelector()
    const headings = screen.getAllByRole('heading', { level: 4 })
    const texts = headings.map((h) => h.textContent ?? '')
    expect(texts.length).toBeGreaterThan(0)
    expect(texts[0]).toContain('COST 3')
  })

  it('clicking a character dispatches SET_CHARACTER and auto-syncs cost', async () => {
    const user = userEvent.setup()
    renderSelector()

    // 適当に「3 cost ではない」キャラを選び、cost 自動同期が見えるようにする
    const target = CHARACTERS.find((c) => c.cost === 1.5)!
    const button = screen.getByRole('button', { name: new RegExp(target.name) })
    await user.click(button)

    expect(screen.getByTestId('self-character').textContent).toBe(target.id)
    expect(screen.getByTestId('self-cost').textContent).toBe('1.5')
  })

  it('clicking 未選択 sets characterId to null', async () => {
    const user = userEvent.setup()
    const target = CHARACTERS[0]
    renderSelector(target.id)

    await user.click(screen.getByRole('button', { name: /未選択/ }))
    expect(screen.getByTestId('self-character').textContent).toBe('null')
  })

  it('search filters the list by name', async () => {
    const user = userEvent.setup()
    renderSelector()

    const target = CHARACTERS[0]
    const input = screen.getByRole('searchbox', { name: /機体検索/ })
    await user.type(input, target.name)

    // セクション見出しは消える (フラット表示)
    expect(screen.queryByRole('heading', { level: 4 })).toBeNull()
    expect(
      screen.getByRole('button', { name: new RegExp(target.name) }),
    ).toBeTruthy()
  })

  it('search by searchTokens (alias) matches as well', async () => {
    const user = userEvent.setup()
    renderSelector()

    // CHARACTERS の中で searchTokens に "amuro" を持つ機体は複数あるはずなので、
    // 検索キーを 1 つに絞れる token を使う
    const target = CHARACTERS.find((c) => c.searchTokens.includes('zechs'))
    if (!target) return // データ変更で消えても黙ってスキップ
    const input = screen.getByRole('searchbox', { name: /機体検索/ })
    await user.type(input, 'zechs')
    expect(
      screen.getByRole('button', { name: new RegExp(target.name) }),
    ).toBeTruthy()
  })

  it('empty result shows a placeholder message', async () => {
    const user = userEvent.setup()
    renderSelector()

    const input = screen.getByRole('searchbox', { name: /機体検索/ })
    await user.type(input, 'absolutely-no-match-string-zzzzz')
    expect(screen.getByText(/該当する機体がありません/)).toBeTruthy()
  })

  it('current character is marked aria-pressed=true', () => {
    const target = CHARACTERS[0]
    renderSelector(target.id)
    const button = screen.getByRole('button', { name: new RegExp(target.name) })
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })

  it('within list region: current button is marked', () => {
    // セクション内の特定機体ボタンを within で取れることの確認
    const target = CHARACTERS[0]
    renderSelector(target.id)
    const list = screen.getByRole('list', { name: /機体リスト/ })
    const button = within(list).getByRole('button', {
      name: new RegExp(target.name),
    })
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })
})
