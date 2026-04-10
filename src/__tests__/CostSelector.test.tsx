/**
 * CostSelector のコンポーネントテスト。
 *
 * 目的: 「ボタンクリック → 正しい SET_COST action が dispatch され、選択中
 * unit の cost が実際に更新される」ことを保証する。reducer 自体は
 * boardReducer.test.ts で検証済みだが、UI からの配線ミス (unitId 取り違え、
 * action type の typo、props 経路の崩れなど) はこのテストで拾う。
 */

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { CostSelector } from '../components/inspector/CostSelector'
import { useBoard } from '../state/BoardContext'
import { BoardProvider } from '../state/BoardProvider'

function CostProbe() {
  const board = useBoard()
  return <span data-testid="self-cost">{String(board.units.self.cost)}</span>
}

function renderCostSelector() {
  return render(
    <BoardProvider>
      <CostProbe />
      <CostSelector unitId="self" current={3} />
    </BoardProvider>,
  )
}

describe('CostSelector', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders all four cost options', () => {
    renderCostSelector()
    for (const label of ['1.5', '2', '2.5', '3']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }
  })

  it('marks the current cost as pressed', () => {
    renderCostSelector()
    // BoardProvider の初期 state では self.cost は INITIAL_BOARD_STATE に従って 3
    const three = screen.getByRole('button', { name: '3' })
    expect(three.getAttribute('aria-pressed')).toBe('true')

    const two = screen.getByRole('button', { name: '2' })
    expect(two.getAttribute('aria-pressed')).toBe('false')
  })

  it('dispatches SET_COST and updates state when clicked', async () => {
    const user = userEvent.setup()
    renderCostSelector()

    expect(screen.getByTestId('self-cost').textContent).toBe('3')

    await user.click(screen.getByRole('button', { name: '2' }))

    // dispatch → reducer → BoardProvider の present 更新 → Probe の再 render
    expect(screen.getByTestId('self-cost').textContent).toBe('2')
  })
})
