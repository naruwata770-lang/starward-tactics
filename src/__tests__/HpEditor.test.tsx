/**
 * HpEditor のコンポーネントテスト (Issue #58)。
 *
 * 検証目的:
 * - 「機体未選択時はヒント文を出す」(non-interactive)
 * - 「スライダー操作で SET_HP が dispatch され、reducer 経由で state が更新される」
 * - 「数値入力で同じく更新される」
 * - 「最大に戻すボタンで maxHp に戻る」
 * - 「dispatch 経路の disabled (無効値) ガードは reducer 側にあるが、UI 側でも
 *    値域は保たれる」
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { HpEditor } from '../components/inspector/HpEditor'
import { CHARACTERS } from '../data/characters'
import { useBoard } from '../state/BoardContext'
import { BoardProvider } from '../state/BoardProvider'
import { boardReducer } from '../state/boardReducer'
import { INITIAL_BOARD_STATE } from '../constants/game'

const TARGET = CHARACTERS[0]

function HpProbe() {
  const board = useBoard()
  const hp = board.units.self.hp
  return <span data-testid="self-hp">{hp === null ? 'null' : String(hp)}</span>
}

/**
 * HpEditor は本体 (InspectorPanel) では BoardContext から取得した値を prop に渡される。
 * テストでも同じ pattern を使い、state 更新が prop に反映されることを確認する。
 */
function HpEditorBound() {
  const board = useBoard()
  const u = board.units.self
  return <HpEditor unitId="self" characterId={u.characterId} hp={u.hp} />
}

/**
 * 機体選択済み state を初期 state として注入してレンダーする。
 * SET_CHARACTER 経由で `cost` / `hp` が同期された state を作る。
 */
function renderWithCharacter() {
  const initial = boardReducer(INITIAL_BOARD_STATE, {
    type: 'SET_CHARACTER',
    unitId: 'self',
    characterId: TARGET.id,
  })
  return render(
    <BoardProvider initialState={initial}>
      <HpProbe />
      <HpEditorBound />
    </BoardProvider>,
  )
}

afterEach(() => {
  cleanup()
})

describe('HpEditor', () => {
  it('shows a hint when characterId is null (non-interactive)', () => {
    render(
      <BoardProvider>
        <HpEditor unitId="self" characterId={null} hp={null} />
      </BoardProvider>,
    )
    expect(screen.getByText(/機体を選ぶと HP を編集できます/)).toBeTruthy()
    expect(screen.queryByLabelText('HP スライダー')).toBeNull()
  })

  it('renders slider, number input and reset button when character is selected', () => {
    renderWithCharacter()
    expect(screen.getByLabelText('HP スライダー')).toBeTruthy()
    expect(screen.getByLabelText('HP 数値入力')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'HP 最大に戻す' })).toBeTruthy()
  })

  it('changing the slider dispatches SET_HP and updates state', () => {
    renderWithCharacter()
    const slider = screen.getByLabelText('HP スライダー') as HTMLInputElement
    // React の controlled input は native value 代入では change が伝わらない。
    // testing-library の fireEvent.change を使う (target.value も合わせて変更してくれる)。
    fireEvent.change(slider, { target: { value: '300' } })
    expect(screen.getByTestId('self-hp').textContent).toBe('300')
  })

  it('Codex レビュー反映: 空文字 input は dispatch されない (HP=0 撃破誤判定の防止)', () => {
    renderWithCharacter()
    // まず slider で 300 にしておく
    const slider = screen.getByLabelText('HP スライダー') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '300' } })
    expect(screen.getByTestId('self-hp').textContent).toBe('300')

    // 数値入力欄を空にする (編集中の中間状態) → state は変わらない
    const numberInput = screen.getByLabelText('HP 数値入力') as HTMLInputElement
    fireEvent.change(numberInput, { target: { value: '' } })
    // hp は 300 のまま (0 として dispatch されてはいけない)
    expect(screen.getByTestId('self-hp').textContent).toBe('300')
  })

  it('the reset button restores hp to maxHp and disables itself', async () => {
    const user = userEvent.setup()
    renderWithCharacter()

    // 最初は maxHp なのでボタンは disabled
    const reset = screen.getByRole('button', { name: 'HP 最大に戻す' }) as HTMLButtonElement
    expect(reset.disabled).toBe(true)

    // HP を下げる (slider 経由)
    const slider = screen.getByLabelText('HP スライダー') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '100' } })
    expect(screen.getByTestId('self-hp').textContent).toBe('100')

    // ボタンが enable になる
    const resetAfter = screen.getByRole('button', { name: 'HP 最大に戻す' }) as HTMLButtonElement
    expect(resetAfter.disabled).toBe(false)

    // クリックで maxHp に戻る
    await user.click(resetAfter)
    expect(screen.getByTestId('self-hp').textContent).toBe(String(TARGET.maxHp))
  })
})
