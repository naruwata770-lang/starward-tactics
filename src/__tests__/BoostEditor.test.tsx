/**
 * BoostEditor のコンポーネントテスト (Issue #58)。
 *
 * - スライダー操作で SET_BOOST が dispatch される
 * - 最大に戻すボタンで 100 に戻る
 * - characterId に依存せず動く (HP との違い)
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { BoostEditor } from '../components/inspector/BoostEditor'
import { useBoard } from '../state/BoardContext'
import { BoardProvider } from '../state/BoardProvider'

function BoostProbe() {
  const board = useBoard()
  return <span data-testid="self-boost">{String(board.units.self.boost)}</span>
}

/** prop 経路を本体と同じく BoardContext に bind する */
function BoostEditorBound() {
  const board = useBoard()
  return <BoostEditor unitId="self" boost={board.units.self.boost} />
}

afterEach(() => {
  cleanup()
})

describe('BoostEditor', () => {
  it('renders slider, number input and reset button (works without character)', () => {
    render(
      <BoardProvider>
        <BoostProbe />
        <BoostEditorBound />
      </BoardProvider>,
    )
    expect(screen.getByLabelText('Boost スライダー')).toBeTruthy()
    expect(screen.getByLabelText('Boost 数値入力')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Boost 最大に戻す' })).toBeTruthy()
  })

  it('changing the slider dispatches SET_BOOST and updates state', () => {
    render(
      <BoardProvider>
        <BoostProbe />
        <BoostEditorBound />
      </BoardProvider>,
    )
    const slider = screen.getByLabelText('Boost スライダー') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '40' } })
    expect(screen.getByTestId('self-boost').textContent).toBe('40')
  })

  it('Codex レビュー反映: 空文字 input は dispatch されない (Boost=0 誤入力防止)', () => {
    render(
      <BoardProvider>
        <BoostProbe />
        <BoostEditorBound />
      </BoardProvider>,
    )
    const slider = screen.getByLabelText('Boost スライダー') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '60' } })
    expect(screen.getByTestId('self-boost').textContent).toBe('60')

    const numberInput = screen.getByLabelText('Boost 数値入力') as HTMLInputElement
    fireEvent.change(numberInput, { target: { value: '' } })
    expect(screen.getByTestId('self-boost').textContent).toBe('60')
  })

  it('reset button restores boost to 100 and disables itself when at max', async () => {
    const user = userEvent.setup()
    render(
      <BoardProvider>
        <BoostProbe />
        <BoostEditorBound />
      </BoardProvider>,
    )

    const reset = screen.getByRole('button', { name: 'Boost 最大に戻す' }) as HTMLButtonElement
    expect(reset.disabled).toBe(true)

    const slider = screen.getByLabelText('Boost スライダー') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '20' } })
    expect(screen.getByTestId('self-boost').textContent).toBe('20')

    const resetAfter = screen.getByRole('button', { name: 'Boost 最大に戻す' }) as HTMLButtonElement
    expect(resetAfter.disabled).toBe(false)
    await user.click(resetAfter)
    expect(screen.getByTestId('self-boost').textContent).toBe('100')
  })
})
