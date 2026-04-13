/**
 * TeamRemainingCostEditor のテスト (Issue #60)。
 *
 * Probe パターン: BoardProvider + Probe で「クリック → action dispatch →
 * state 変化」を検証する (`.claude/rules/testing.md`)。
 */

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TeamRemainingCostEditor } from '../components/inspector/TeamRemainingCostEditor'
import { INITIAL_BOARD_STATE } from '../constants/game'
import { useBoard } from '../state/BoardContext'
import { BoardProvider } from '../state/BoardProvider'
import type { BoardState } from '../types/board'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function Probe() {
  const { teamRemainingCost } = useBoard()
  return (
    <>
      <span data-testid="probe-ally">{teamRemainingCost.ally}</span>
      <span data-testid="probe-enemy">{teamRemainingCost.enemy}</span>
    </>
  )
}

function renderEditor(state: BoardState = INITIAL_BOARD_STATE) {
  return render(
    <BoardProvider initialState={state}>
      <TeamRemainingCostEditor />
      <Probe />
    </BoardProvider>,
  )
}

describe('TeamRemainingCostEditor', () => {
  it('renders the current value for each team in x.x/6.0 form', () => {
    renderEditor({
      ...INITIAL_BOARD_STATE,
      teamRemainingCost: { ally: 4.5, enemy: 2 },
    })
    expect(screen.getByTestId('team-remaining-cost-ally').textContent).toBe(
      '4.5/6.0',
    )
    expect(screen.getByTestId('team-remaining-cost-enemy').textContent).toBe(
      '2.0/6.0',
    )
  })

  it('decrements ally by 0.5 on − click', async () => {
    const user = userEvent.setup()
    renderEditor()
    expect(screen.getByTestId('probe-ally').textContent).toBe('6')
    await user.click(
      screen.getByRole('button', { name: /味方残コストを 0.5 減らす/ }),
    )
    expect(screen.getByTestId('probe-ally').textContent).toBe('5.5')
  })

  it('increments enemy by 0.5 on + click', async () => {
    const user = userEvent.setup()
    renderEditor({
      ...INITIAL_BOARD_STATE,
      teamRemainingCost: { ally: 6, enemy: 2 },
    })
    await user.click(
      screen.getByRole('button', { name: /敵残コストを 0.5 増やす/ }),
    )
    expect(screen.getByTestId('probe-enemy').textContent).toBe('2.5')
  })

  it('disables − at value 0 and + at value 6', () => {
    renderEditor({
      ...INITIAL_BOARD_STATE,
      teamRemainingCost: { ally: 0, enemy: 6 },
    })
    const allyMinus = screen.getByRole('button', {
      name: /味方残コストを 0.5 減らす/,
    }) as HTMLButtonElement
    const enemyPlus = screen.getByRole('button', {
      name: /敵残コストを 0.5 増やす/,
    }) as HTMLButtonElement
    expect(allyMinus.disabled).toBe(true)
    expect(enemyPlus.disabled).toBe(true)
  })
})
