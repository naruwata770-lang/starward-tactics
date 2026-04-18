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
import { ExportButton } from '../components/toolbar/ExportButton'
import { HpBoostToggleButton } from '../components/toolbar/HpBoostToggleButton'
import { RedoButton } from '../components/toolbar/RedoButton'
import { ResetButton } from '../components/toolbar/ResetButton'
import { ShareButton } from '../components/toolbar/ShareButton'
import { UndoButton } from '../components/toolbar/UndoButton'
import { useBoard, useShowHpBoost } from '../state/BoardContext'
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

  describe('HpBoostToggleButton (Issue #58)', () => {
    function ToggleProbe() {
      const { showHpBoost } = useShowHpBoost()
      return <span data-testid="show-hp-boost">{String(showHpBoost)}</span>
    }

    function makeStorageStub() {
      const store = new Map<string, string>()
      return {
        store,
        api: {
          getItem: vi.fn((k: string) => store.get(k) ?? null),
          setItem: vi.fn((k: string, v: string) => {
            store.set(k, v)
          }),
          removeItem: vi.fn((k: string) => {
            store.delete(k)
          }),
          clear: vi.fn(() => store.clear()),
          key: vi.fn(),
          length: 0,
        },
      }
    }

    it('default state is ON when localStorage has no saved value', () => {
      const { api } = makeStorageStub()
      vi.stubGlobal('localStorage', api)

      render(
        <BoardProvider>
          <ToggleProbe />
          <HpBoostToggleButton />
        </BoardProvider>,
      )

      expect(screen.getByTestId('show-hp-boost').textContent).toBe('true')
      expect(getButton('HP/Boost 表示を隠す').textContent).toContain('ON')
    })

    it('reads "0" from localStorage to start in OFF state', () => {
      const { store, api } = makeStorageStub()
      store.set('tacticsboard.ui.showHpBoost', '0')
      vi.stubGlobal('localStorage', api)

      render(
        <BoardProvider>
          <ToggleProbe />
          <HpBoostToggleButton />
        </BoardProvider>,
      )

      expect(screen.getByTestId('show-hp-boost').textContent).toBe('false')
      expect(getButton('HP/Boost 表示を表示する').textContent).toContain('OFF')
    })

    it('toggling the button writes the new value to localStorage', async () => {
      const user = userEvent.setup()
      const { store, api } = makeStorageStub()
      vi.stubGlobal('localStorage', api)

      render(
        <BoardProvider>
          <ToggleProbe />
          <HpBoostToggleButton />
        </BoardProvider>,
      )

      // 初期 ON → クリックで OFF
      await user.click(getButton('HP/Boost 表示を隠す'))
      expect(screen.getByTestId('show-hp-boost').textContent).toBe('false')
      expect(store.get('tacticsboard.ui.showHpBoost')).toBe('0')

      // もう一度クリックで ON
      await user.click(getButton('HP/Boost 表示を表示する'))
      expect(screen.getByTestId('show-hp-boost').textContent).toBe('true')
      expect(store.get('tacticsboard.ui.showHpBoost')).toBe('1')
    })

    it('survives localStorage.getItem throwing (defaults to ON)', () => {
      // private mode / sandbox 等で getItem が throw するケース。
      // BoardProvider がクラッシュせず、デフォルト (ON) で起動する。
      const throwApi = {
        getItem: vi.fn(() => {
          throw new Error('storage denied')
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      }
      vi.stubGlobal('localStorage', throwApi)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      render(
        <BoardProvider>
          <ToggleProbe />
          <HpBoostToggleButton />
        </BoardProvider>,
      )

      expect(screen.getByTestId('show-hp-boost').textContent).toBe('true')
      warnSpy.mockRestore()
    })

    it('survives localStorage.setItem throwing (UI continues to update)', async () => {
      const user = userEvent.setup()
      const throwApi = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(() => {
          throw new Error('quota exceeded')
        }),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      }
      vi.stubGlobal('localStorage', throwApi)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      render(
        <BoardProvider>
          <ToggleProbe />
          <HpBoostToggleButton />
        </BoardProvider>,
      )

      // 初期 ON。クリックで OFF に切り替わるが setItem は throw する
      await user.click(getButton('HP/Boost 表示を隠す'))
      // UI 上は OFF になっている
      expect(screen.getByTestId('show-hp-boost').textContent).toBe('false')
      warnSpy.mockRestore()
    })
  })

  /**
   * 視覚階層 (Issue #87) を color token 単位で固定する。
   *
   * 目的: buttonVariants.ts のスタイルが意図せず書き換わったとき、CI で
   * デグレとして検知する。class 全文一致ではなく意味トークン
   * (`bg-violet-600` / `border-slate-700` など) で見ることで、周辺 class の
   * 微調整には追従しつつ階層設計そのものの崩壊を拾う。
   */
  describe('visual hierarchy variants (Issue #87)', () => {
    it('ShareButton uses primary-strong variant (violet solid)', () => {
      render(
        <BoardProvider>
          <ShareButton />
        </BoardProvider>,
      )
      const cls = getButton('URLをコピー').className
      expect(cls).toContain('bg-violet-600')
      expect(cls).toContain('text-white')
    })

    it('ExportButton uses primary-soft variant (violet tinted)', () => {
      render(
        <BoardProvider>
          <ExportButton />
        </BoardProvider>,
      )
      const cls = getButton('PNG出力').className
      expect(cls).toContain('bg-violet-950/40')
      expect(cls).toContain('border-violet-500/60')
    })

    it('UndoButton uses secondary variant (slate ghost + border)', () => {
      render(
        <BoardProvider>
          <UndoButton />
        </BoardProvider>,
      )
      const cls = getButton('元に戻す').className
      expect(cls).toContain('bg-slate-900/50')
      expect(cls).toContain('border-slate-700')
    })

    it('RedoButton uses secondary variant', () => {
      render(
        <BoardProvider>
          <RedoButton />
        </BoardProvider>,
      )
      const cls = getButton('やり直す').className
      expect(cls).toContain('bg-slate-900/50')
      expect(cls).toContain('border-slate-700')
    })

    it('ResetButton uses destructive variant (rose)', () => {
      render(
        <BoardProvider>
          <ResetButton />
        </BoardProvider>,
      )
      const cls = getButton('盤面をリセット').className
      expect(cls).toContain('bg-rose-900')
      expect(cls).toContain('text-rose-100')
    })

    it('HpBoostToggleButton switches variants on toggle state', async () => {
      const user = userEvent.setup()
      render(
        <BoardProvider>
          <HpBoostToggleButton />
        </BoardProvider>,
      )

      // 初期 ON → TOGGLE_ON variant (emerald tinted ghost)
      const onButton = getButton('HP/Boost 表示を隠す')
      expect(onButton.className).toContain('bg-emerald-950/40')
      expect(onButton.className).toContain('border-emerald-600')
      // primary CTA の violet 塗りつぶしとは別系統であることを固定する
      expect(onButton.className).not.toContain('bg-violet-600')

      // クリックして OFF → SECONDARY variant
      await user.click(onButton)
      const offButton = getButton('HP/Boost 表示を表示する')
      expect(offButton.className).toContain('bg-slate-900/50')
      expect(offButton.className).toContain('border-slate-700')
    })
  })
})
