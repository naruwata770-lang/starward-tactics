/**
 * Toolbar 系コンポーネントの最低限のテスト。
 *
 * 目的:
 * - Undo/Redo ボタンが canUndo/canRedo に追従して disabled が切り替わる
 * - Reset ボタンが confirm をキャンセルすると state を変えない
 * - Reset ボタンが confirm OK で INITIAL_BOARD_STATE に戻す
 *
 * Phase 4 で確立した「BoardProvider でラップして dispatch 経路を検証する」
 * パターンを踏襲。
 */

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CostSelector } from '../components/inspector/CostSelector'
import { RedoButton } from '../components/toolbar/RedoButton'
import { ResetButton } from '../components/toolbar/ResetButton'
import { ShareButton } from '../components/toolbar/ShareButton'
import { UndoButton } from '../components/toolbar/UndoButton'
import { useBoard } from '../state/BoardContext'
import { BoardProvider } from '../state/BoardProvider'

function Probe() {
  const board = useBoard()
  return (
    <span data-testid="self-cost">{String(board.units.self.cost)}</span>
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  // happy-dom は元々 window.confirm を持たないため、vi.stubGlobal で代入した
  // モックは vi.unstubAllGlobals() で元の (= undefined) 状態に戻す。
  // これを忘れると後続テストに stub が漏れて順序依存の失敗を起こす。
  vi.unstubAllGlobals()
})

/**
 * 指定 name のボタンを HTMLButtonElement として取得 (型 narrowing 込み)。
 * `disabled` プロパティへの直接アクセスのため。
 */
function getButton(name: string): HTMLButtonElement {
  return screen.getByRole('button', { name }) as HTMLButtonElement
}

describe('Toolbar buttons', () => {
  describe('UndoButton / RedoButton disabled state', () => {
    it('Undo and Redo are both disabled at initial state', () => {
      render(
        <BoardProvider>
          <UndoButton />
          <RedoButton />
        </BoardProvider>,
      )
      expect(getButton('元に戻す').disabled).toBe(true)
      expect(getButton('やり直す').disabled).toBe(true)
    })

    it('Undo becomes enabled after a SET action; Redo becomes enabled after Undo', async () => {
      const user = userEvent.setup()
      render(
        <BoardProvider>
          <Probe />
          <CostSelector unitId="self" current={3} />
          <UndoButton />
          <RedoButton />
        </BoardProvider>,
      )

      // 初期: cost=3
      expect(screen.getByTestId('self-cost').textContent).toBe('3')

      // SET_COST で history が積まれる
      await user.click(screen.getByRole('button', { name: '2' }))
      expect(screen.getByTestId('self-cost').textContent).toBe('2')

      expect(getButton('元に戻す').disabled).toBe(false)
      expect(getButton('やり直す').disabled).toBe(true)

      // Undo
      await user.click(getButton('元に戻す'))
      expect(screen.getByTestId('self-cost').textContent).toBe('3')
      expect(getButton('やり直す').disabled).toBe(false)

      // Redo
      await user.click(getButton('やり直す'))
      expect(screen.getByTestId('self-cost').textContent).toBe('2')
    })
  })

  describe('ShareButton', () => {
    it('copies URL to clipboard and shows success label', async () => {
      const user = userEvent.setup()
      const writeText = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('navigator', {
        clipboard: { writeText },
      })

      render(
        <BoardProvider>
          <ShareButton />
        </BoardProvider>,
      )
      const button = screen.getByRole('button', { name: 'URLをコピー' })
      expect(button.textContent).toContain('共有')

      await user.click(button)

      expect(writeText).toHaveBeenCalled()
      // board state から直接 encode した URL がコピーされる
      const copiedUrl = writeText.mock.calls[0][0] as string
      expect(copiedUrl).toMatch(/^https?:\/\//)
      expect(button.textContent).toContain('コピー')
    })

    it('does not show success label when clipboard write fails', async () => {
      const user = userEvent.setup()
      const writeText = vi.fn().mockRejectedValue(new Error('denied'))
      vi.stubGlobal('navigator', {
        clipboard: { writeText },
      })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      render(
        <BoardProvider>
          <ShareButton />
        </BoardProvider>,
      )
      const button = screen.getByRole('button', { name: 'URLをコピー' })

      await user.click(button)

      expect(button.textContent).toContain('共有')
      expect(button.textContent).not.toContain('コピー')
      expect(warnSpy).toHaveBeenCalled()

      warnSpy.mockRestore()
    })
  })

  describe('ResetButton', () => {
    it('does not dispatch RESET when confirm is cancelled', async () => {
      const user = userEvent.setup()
      // happy-dom は window.confirm を持たないので、vi.stubGlobal で stub する
      // (afterEach の vi.unstubAllGlobals() で確実に元に戻る)
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(false))

      render(
        <BoardProvider>
          <Probe />
          <CostSelector unitId="self" current={3} />
          <ResetButton />
        </BoardProvider>,
      )

      // SET_COST で値を変える
      await user.click(screen.getByRole('button', { name: '2' }))
      expect(screen.getByTestId('self-cost').textContent).toBe('2')

      // Reset を押すが confirm キャンセル
      await user.click(screen.getByRole('button', { name: '盤面をリセット' }))
      expect(screen.getByTestId('self-cost').textContent).toBe('2')
    })

    it('dispatches RESET and restores INITIAL_BOARD_STATE when confirm is accepted', async () => {
      const user = userEvent.setup()
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))

      render(
        <BoardProvider>
          <Probe />
          <CostSelector unitId="self" current={3} />
          <ResetButton />
        </BoardProvider>,
      )

      await user.click(screen.getByRole('button', { name: '2' }))
      expect(screen.getByTestId('self-cost').textContent).toBe('2')

      await user.click(screen.getByRole('button', { name: '盤面をリセット' }))
      // INITIAL_BOARD_STATE では cost = 3
      expect(screen.getByTestId('self-cost').textContent).toBe('3')
    })
  })
})
