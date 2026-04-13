/**
 * BoardProvider: ボード状態と UI 状態を子コンポーネントに提供する。
 *
 * Context オブジェクトと購読 hooks は BoardContext.ts に定義。
 * このファイルは Fast Refresh の制約 (react-refresh/only-export-components)
 * を満たすため、コンポーネントのみを export している。
 */

import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'

import { INITIAL_BOARD_STATE } from '../constants/game'
import type { BoardState, UnitId } from '../types/board'
import {
  BoardDispatchContext,
  BoardPresentContext,
  BoardStateContext,
  UIContext,
  type UIContextValue,
} from './BoardContext'
import { boardReducer } from './boardReducer'
import { createInitialHistory, withHistory } from './withHistory'

const historicalReducer = withHistory(boardReducer)

/**
 * localStorage の key 名 (Issue #58)。
 *
 * 設計判断: 当面は trigger 1 個しかないので **単一 key で start** する
 * (Codex 提案[共通・中] 反映)。将来 UI 設定が 3 個以上に増えたら
 * `tacticsboard.ui` JSON object 1 key に集約する移行案を残す。
 *
 * 値: `'1'` (true) / `'0'` (false)。boolean を直接 JSON 化せず文字列で持つのは、
 * `JSON.parse` の例外ハンドリングを避けて localStorage の lenient な扱いを保つため。
 */
const SHOW_HP_BOOST_LS_KEY = 'tacticsboard.ui.showHpBoost'

/**
 * localStorage から showHpBoost の初期値を読む。
 *
 * 例外時 (SSR / Private mode / quota / iframe sandbox など) はデフォルト true を返す。
 * try/catch で握りつぶすのは UX を壊さないため。DEV では console.warn する。
 */
function readShowHpBoostFromStorage(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = window.localStorage.getItem(SHOW_HP_BOOST_LS_KEY)
    if (raw === null) return true // 未保存
    return raw !== '0' // '0' のみ false、それ以外 (空文字含む) は true 寄せ
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[BoardProvider] localStorage.getItem failed:', e)
    }
    return true
  }
}

function writeShowHpBoostToStorage(value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SHOW_HP_BOOST_LS_KEY, value ? '1' : '0')
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[BoardProvider] localStorage.setItem failed:', e)
    }
  }
}

export interface BoardProviderProps {
  children: ReactNode
  /** テストや復元用の初期 state。省略時は INITIAL_BOARD_STATE */
  initialState?: BoardState
}

export function BoardProvider({ children, initialState }: BoardProviderProps) {
  const [historyState, dispatch] = useReducer(
    historicalReducer,
    initialState ?? INITIAL_BOARD_STATE,
    createInitialHistory,
  )

  // useState の setter は安定参照なので useCallback でラップする必要はない。
  // 初期選択は 'self' (自機) にして、初回ロードからインスペクターが編集状態に
  // なるようにする。null も型上は許容しているが、Phase 5+ で「選択解除」が
  // 必要になったら実装する想定。
  const [selectedUnit, setSelectedUnit] = useState<UnitId | null>('self')

  // Issue #58: HP/Boost 表示トグル。lazy initializer で localStorage を読む。
  const [showHpBoost, setShowHpBoost] = useState<boolean>(() => readShowHpBoostFromStorage())

  // 値変更時に localStorage に書き戻す (例外は writer 側で握りつぶし)。
  useEffect(() => {
    writeShowHpBoostToStorage(showHpBoost)
  }, [showHpBoost])

  const uiValue = useMemo<UIContextValue>(
    () => ({ selectedUnit, setSelectedUnit, showHpBoost, setShowHpBoost }),
    [selectedUnit, showHpBoost],
  )

  return (
    <BoardStateContext.Provider value={historyState}>
      <BoardPresentContext.Provider value={historyState.present}>
        <BoardDispatchContext.Provider value={dispatch}>
          <UIContext.Provider value={uiValue}>{children}</UIContext.Provider>
        </BoardDispatchContext.Provider>
      </BoardPresentContext.Provider>
    </BoardStateContext.Provider>
  )
}
