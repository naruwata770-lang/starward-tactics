/**
 * CoreTypeSelector のコンポーネントテスト。
 *
 * 目的:
 * - 各ボタンに 1 文字 id (F/S/M/D/B/C) と補助ラベル (格闘 / 射撃 / ...) が
 *   常時表示されること (#27 で iteration-1 の「伝わらない」失敗として高で挙がった
 *   legend 追加が回帰しないことを担保する)。
 * - 「ボタンクリック → SET_CORE_TYPE が dispatch され、選択中 unit の coreType が
 *   更新される」配線が崩れていないこと。reducer 自体は boardReducer.test.ts で
 *   検証済みなので、ここでは UI からの配線ミス (unitId 取り違え / action type の
 *   typo / props 経路の崩れ) を拾う。
 */

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { CoreTypeSelector } from '../components/inspector/CoreTypeSelector'
import { CORE_TYPES } from '../constants/game'
import { useBoard } from '../state/BoardContext'
import { BoardProvider } from '../state/BoardProvider'

function CoreProbe() {
  const board = useBoard()
  return <span data-testid="self-core">{board.units.self.coreType}</span>
}

function renderCoreTypeSelector() {
  return render(
    <BoardProvider>
      <CoreProbe />
      <CoreTypeSelector unitId="self" current="B" />
    </BoardProvider>,
  )
}

describe('CoreTypeSelector', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders all six core types with both id and label as visible legend', () => {
    renderCoreTypeSelector()
    const group = screen.getByRole('group', { name: 'コア種別' })

    // 全 6 種について「1 文字 id」と「補助ラベル」が両方常時表示されることを担保する。
    // 過去は title 属性 (hover tooltip) のみで legend が出なかった (#27)。
    for (const { id, label } of CORE_TYPES) {
      // accessible name は子テキストの連結 ("F 格闘" など) になる。
      const button = within(group).getByRole('button', {
        name: new RegExp(`${id}.*${label}`),
      })
      expect(button).toBeTruthy()
    }
  })

  it('marks the current core as pressed', () => {
    renderCoreTypeSelector()
    // BoardProvider の初期 state では self.coreType は INITIAL_BOARD_STATE に従って 'B'
    const balanced = screen.getByRole('button', { name: /B.*バランス/ })
    expect(balanced.getAttribute('aria-pressed')).toBe('true')

    const fight = screen.getByRole('button', { name: /F.*格闘/ })
    expect(fight.getAttribute('aria-pressed')).toBe('false')
  })

  it('dispatches SET_CORE_TYPE and updates state when clicked', async () => {
    const user = userEvent.setup()
    renderCoreTypeSelector()

    expect(screen.getByTestId('self-core').textContent).toBe('B')

    await user.click(screen.getByRole('button', { name: /F.*格闘/ }))

    // dispatch → reducer → BoardProvider の present 更新 → Probe の再 render
    expect(screen.getByTestId('self-core').textContent).toBe('F')
  })
})
