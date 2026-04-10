/**
 * LockTargetSelector のコンポーネントテスト。
 *
 * 目的:
 * - 編集対象ユニットが候補から除外されている (UI 二重防御の UI 側)
 * - 「なし」および他ユニット選択で正しい SET_LOCK_TARGET が dispatch される
 * - 選択中の候補が aria-pressed="true" になる
 */

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { LockTargetSelector } from '../components/inspector/LockTargetSelector'
import { useBoard } from '../state/BoardContext'
import { BoardProvider } from '../state/BoardProvider'

function LockProbe() {
  const board = useBoard()
  const target = board.units.self.lockTarget
  return <span data-testid="self-lock">{target ?? 'null'}</span>
}

function renderLockTargetSelector() {
  return render(
    <BoardProvider>
      <LockProbe />
      <LockTargetSelector unitId="self" current={null} />
    </BoardProvider>,
  )
}

describe('LockTargetSelector', () => {
  afterEach(() => {
    cleanup()
  })

  it('excludes the editing unit (self) from candidates', () => {
    renderLockTargetSelector()
    // 選択肢は「なし」「相方」「敵1」「敵2」の 4 つ。「自機」(self) は除外される。
    expect(screen.getByRole('button', { name: 'なし' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '相方' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '敵1' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '敵2' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '自機' })).toBeNull()
  })

  it('marks "なし" as pressed when current is null', () => {
    renderLockTargetSelector()
    const none = screen.getByRole('button', { name: 'なし' })
    expect(none.getAttribute('aria-pressed')).toBe('true')

    const enemy1 = screen.getByRole('button', { name: '敵1' })
    expect(enemy1.getAttribute('aria-pressed')).toBe('false')
  })

  it('dispatches SET_LOCK_TARGET and updates state when a unit is clicked', async () => {
    const user = userEvent.setup()
    renderLockTargetSelector()

    expect(screen.getByTestId('self-lock').textContent).toBe('null')

    await user.click(screen.getByRole('button', { name: '敵1' }))

    expect(screen.getByTestId('self-lock').textContent).toBe('enemy1')
  })
})
