/**
 * Board の Context オブジェクト定義と購読 hooks。
 *
 * Context を 4 つに分割しているのは、ドラッグ中の連続更新で
 * 全 Consumer が再 render されるのを避けるため:
 * - BoardStateContext: history 全体（Undo/Redo ボタンなど past/future が必要なもの）
 * - BoardPresentContext: present だけ（盤面表示用）。past/future が変わっても
 *   present の参照が変わらなければ再 render されない
 * - BoardDispatchContext: dispatch だけ欲しいものは state 変更で再 render されない
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

export const BoardPresentContext = createContext<BoardState | null>(null)

export const BoardDispatchContext = createContext<Dispatch<BoardAction> | null>(
  null,
)

export interface UIContextValue {
  selectedUnit: UnitId | null
  setSelectedUnit: (unit: UnitId | null) => void
}

export const UIContext = createContext<UIContextValue | null>(null)

// ---- hooks ----

/** history 込みの state を取得（Undo/Redo ボタンの有効状態判定など） */
export function useBoardHistory(): HistoryState<BoardState> {
  const ctx = useContext(BoardStateContext)
  if (!ctx) throw new Error('useBoardHistory must be used within BoardProvider')
  return ctx
}

/**
 * 現在のボード状態 (history.present) を取得。
 * past/future の変化では再 render されない（present の参照が変わったときだけ）。
 */
export function useBoard(): BoardState {
  const ctx = useContext(BoardPresentContext)
  if (!ctx) throw new Error('useBoard must be used within BoardProvider')
  return ctx
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

/** 選択中ユニットと setter (UI 状態) */
export function useSelection(): UIContextValue {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useSelection must be used within BoardProvider')
  return ctx
}
