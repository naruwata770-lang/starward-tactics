/**
 * Board の Context オブジェクト定義と購読 hooks。
 *
 * Context を 3 つに分割しているのは、ドラッグ中の連続更新で
 * 全 Consumer が再 render されるのを避けるため:
 * - BoardStateContext: state の購読が必要なものだけ
 * - BoardDispatchContext: dispatch だけ欲しいものは再 render されない
 * - UIContext: selectedUnit など URL に含めたくない UI 状態
 *
 * Provider 本体は BoardProvider.tsx を参照。
 */

import { createContext, useContext, useMemo, type Dispatch } from 'react'

import type { BoardAction, BoardState, UnitId } from '../types/board'
import type { HistoryState } from './withHistory'

export const BoardStateContext = createContext<HistoryState<BoardState> | null>(
  null,
)

export const BoardDispatchContext = createContext<Dispatch<BoardAction> | null>(
  null,
)

export interface UIContextValue {
  selectedUnit: UnitId | null
  setSelectedUnit: (unit: UnitId | null) => void
}

export const UIContext = createContext<UIContextValue | null>(null)

// ---- hooks ----

/** history 込みの state を取得（Undo/Redo ボタンの有効状態判定に使う） */
export function useBoardHistory(): HistoryState<BoardState> {
  const ctx = useContext(BoardStateContext)
  if (!ctx) throw new Error('useBoardHistory must be used within BoardProvider')
  return ctx
}

/** 現在のボード状態（history.present）を取得 */
export function useBoard(): BoardState {
  return useBoardHistory().present
}

/** Undo/Redo の可否 */
export function useHistoryAvailability() {
  const { past, future } = useBoardHistory()
  return useMemo(
    () => ({ canUndo: past.length > 0, canRedo: future.length > 0 }),
    [past.length, future.length],
  )
}

/** dispatch */
export function useBoardDispatch(): Dispatch<BoardAction> {
  const ctx = useContext(BoardDispatchContext)
  if (!ctx) throw new Error('useBoardDispatch must be used within BoardProvider')
  return ctx
}

/** 選択中ユニット (UI 状態) */
export function useSelectedUnit(): UIContextValue {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useSelectedUnit must be used within BoardProvider')
  return ctx
}
