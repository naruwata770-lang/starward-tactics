/**
 * useUrlSync の race condition と popstate 経路を検証するテスト。
 *
 * レビュー指摘 (Codex 高: pending デバウンス書き戻しが LOAD_STATE / popstate 経路で
 * cancel されない race) を反映した修正の動作確認。
 *
 * 検証項目:
 * 1. 共有 URL 付きの初回ロードでは App 側で initialState 経由で復元される
 *    → 1 フレームのフラッシュなし、useUrlSync が誤って復元 URL を上書きしない
 * 2. popstate で別の `?b=` に戻ると、保留中のデバウンス write が cancel され、
 *    新しい URL の state へ正しく遷移する
 * 3. popstate で `?b=` が消えた場合は INITIAL_BOARD_STATE に戻る (RESET dispatch)
 */

import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CostSelector } from '../components/inspector/CostSelector'
import { useUrlSync } from '../hooks/useUrlSync'
import { useBoard } from '../state/BoardContext'
import { BoardProvider } from '../state/BoardProvider'
import { decode, encode } from '../state/urlCodec'
import type { BoardState } from '../types/board'

function UrlSyncBridge() {
  useUrlSync()
  return null
}

function CostProbe() {
  const board = useBoard()
  return <span data-testid="self-cost">{String(board.units.self.cost)}</span>
}

/**
 * `?b=` パラメータを set/clear するヘルパー (history も汚さない)。
 */
function setUrlParam(param: string | null) {
  const url = new URL(window.location.href)
  if (param === null) {
    url.searchParams.delete('b')
  } else {
    url.searchParams.set('b', param)
  }
  window.history.replaceState(window.history.state, '', url.toString())
}

/**
 * App.tsx と同じロジック: ?b= から initialState を作る。
 * 本物の App をテストすると Layout 等の関係ない依存も巻き込むので、
 * ここで小さな wrapper を再現する。
 */
function MiniApp() {
  const param = new URLSearchParams(window.location.search).get('b')
  const initialState: BoardState | undefined =
    param !== null ? decode(param) ?? undefined : undefined
  return (
    <BoardProvider initialState={initialState}>
      <UrlSyncBridge />
      <CostProbe />
      <CostSelector unitId="self" current={initialState?.units.self.cost ?? 3} />
    </BoardProvider>
  )
}

beforeEach(() => {
  // 各テストで URL を綺麗な状態にする
  setUrlParam(null)
})

afterEach(() => {
  cleanup()
  setUrlParam(null)
})

describe('useUrlSync', () => {
  it('restores state synchronously from ?b= via initialState (no flash)', () => {
    // 共有 URL の体: cost=2 の self
    const customState: BoardState = (() => {
      // INITIAL_BOARD_STATE をベースに self.cost を 2 にしたものを作る
      // (decode 経由で取得することで encode/decode の整合も保証する)
      const seed = decode(encode({
        units: {
          self: {
            id: 'self',
            x: 260,
            y: 460,
            direction: 0,
            cost: 2,
            starburst: 'none',
            coreType: 'B',
            lockTarget: null,
            characterId: null,
            hp: null,
            boost: 100,
          },
          ally: {
            id: 'ally',
            x: 460,
            y: 460,
            direction: 0,
            cost: 3,
            starburst: 'none',
            coreType: 'B',
            lockTarget: null,
            characterId: null,
            hp: null,
            boost: 100,
          },
          enemy1: {
            id: 'enemy1',
            x: 260,
            y: 260,
            direction: 180,
            cost: 3,
            starburst: 'none',
            coreType: 'B',
            lockTarget: null,
            characterId: null,
            hp: null,
            boost: 100,
          },
          enemy2: {
            id: 'enemy2',
            x: 460,
            y: 260,
            direction: 180,
            cost: 3,
            starburst: 'none',
            coreType: 'B',
            lockTarget: null,
            characterId: null,
            hp: null,
            boost: 100,
          },
        },
        teamRemainingCost: { ally: 6, enemy: 6 },
      }))
      if (seed === null) throw new Error('test setup: failed to round-trip')
      return seed
    })()
    const customParam = encode(customState)
    setUrlParam(customParam)

    render(<MiniApp />)

    // 初回 render から復元された値が出る (フラッシュなし)
    expect(screen.getByTestId('self-cost').textContent).toBe('2')

    // useUrlSync の state→URL effect が「初期 board と一致」と判定し、
    // ?b= を上書きしないことを確認
    const currentParam = new URLSearchParams(window.location.search).get('b')
    expect(currentParam).toBe(customParam)
  })

  it('popstate to a different ?b= overrides any pending write', async () => {
    const user = userEvent.setup()

    // 初期はパラメータなしで起動
    render(<MiniApp />)
    expect(screen.getByTestId('self-cost').textContent).toBe('3')

    // ユーザーが値を変更 (debounce の最中の状態を作る)
    await user.click(screen.getByRole('button', { name: '2' }))
    expect(screen.getByTestId('self-cost').textContent).toBe('2')

    // 別の ?b= に遷移したことをシミュレート (cost=1.5 の自機)
    const popState: BoardState = {
      units: {
        self: {
          id: 'self',
          x: 260,
          y: 460,
          direction: 0,
          cost: 1.5,
          starburst: 'none',
          coreType: 'B',
          lockTarget: null,
            characterId: null,
            hp: null,
            boost: 100,
        },
        ally: {
          id: 'ally',
          x: 460,
          y: 460,
          direction: 0,
          cost: 3,
          starburst: 'none',
          coreType: 'B',
          lockTarget: null,
            characterId: null,
            hp: null,
            boost: 100,
        },
        enemy1: {
          id: 'enemy1',
          x: 260,
          y: 260,
          direction: 180,
          cost: 3,
          starburst: 'none',
          coreType: 'B',
          lockTarget: null,
            characterId: null,
            hp: null,
            boost: 100,
        },
        enemy2: {
          id: 'enemy2',
          x: 460,
          y: 260,
          direction: 180,
          cost: 3,
          starburst: 'none',
          coreType: 'B',
          lockTarget: null,
            characterId: null,
            hp: null,
            boost: 100,
        },
      },
      teamRemainingCost: { ally: 6, enemy: 6 },
    }
    const popParam = encode(popState)
    setUrlParam(popParam)
    // popstate ハンドラ内の dispatch を React の再 render に反映させるため act で囲む
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    // popstate で復元 → cost が 1.5 に
    expect(screen.getByTestId('self-cost').textContent).toBe('1.5')

    // 重要: 保留中の pending (cost=2 の write) が cancel されているので、
    // しばらく待っても URL は popParam のまま
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(new URLSearchParams(window.location.search).get('b')).toBe(popParam)
    // state も popstate 後の値のまま
    expect(screen.getByTestId('self-cost').textContent).toBe('1.5')
  })

  it('popstate to no ?b= dispatches RESET and restores INITIAL state', async () => {
    const user = userEvent.setup()

    // 初期パラメータなしで起動 → 値変更で history 積み上げ
    render(<MiniApp />)
    await user.click(screen.getByRole('button', { name: '2' }))
    expect(screen.getByTestId('self-cost').textContent).toBe('2')

    // popstate で ?b= が消えたケース
    setUrlParam(null)
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    // INITIAL に戻る (cost=3)
    expect(screen.getByTestId('self-cost').textContent).toBe('3')
  })
})
