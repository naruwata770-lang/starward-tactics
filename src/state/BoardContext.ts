/**
 * Board の Context オブジェクト定義と購読 hooks。
 *
 * Context を 4 つに分割している意図:
 * 各 Context の value 参照が変化したときだけ、その Context を購読している
 * コンポーネントが再 render される。よって用途別に Context を分けることで
 * 「present の値しか使わないコンポーネント」を「past/future の変更」で
 * 再 render させずに済む。
 *
 * - BoardStateContext: history 全体（Undo/Redo ボタンなど past/future が必要なもの）
 * - BoardPresentContext: present だけ（盤面表示用）。past/future が変わっても
 *   present の参照が変わらなければ購読側は再 render されない
 * - BoardDispatchContext: dispatch だけ。dispatch は安定参照なので購読側は
 *   ほぼ再 render されない
 * - UIContext: selectedUnit など URL に含めたくない UI 状態
 *
 * 注: BoardProvider 関数自体は state 変更のたびに再実行される。
 * children prop の参照が安定であれば、React の reconciliation により
 * children の subtree は再評価されない（Context 値が変わった購読者だけが再 render される）。
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
  /**
   * Issue #58: 盤面トークンに HP/Boost を表示するか。
   *
   * - `true` (デフォルト): HP/Boost をトークンの下部スタックに描画する
   * - `false`: 描画しない (#55 までの見た目に近い、シンプル表示)
   *
   * URL には乗せない (現セッションの UI 設定であって state ではない)。
   * localStorage で永続化する (BoardProvider 側で実装)。
   *
   * トークンの縦幅 (UNIT_COORD_Y_MAX) は ON/OFF どちらでも一定で、
   * トグル切替で既存ユニットがクランプされて移動する副作用を起こさない方針
   * (Codex 提案[共通・中] 反映)。
   */
  showHpBoost: boolean
  setShowHpBoost: (v: boolean) => void
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

/**
 * Issue #58: HP/Boost 表示トグルだけを取り出すショートカット。
 * useSelection でも取得できるが、トークン側は selectedUnit に依存させたくないので
 * 専用 hook を切り出して購読範囲を狭める意図はない (UIContext は同一 value)。
 * 単に意図が読み取りやすい呼び出しコードにするための糖衣。
 */
export function useShowHpBoost(): { showHpBoost: boolean; setShowHpBoost: (v: boolean) => void } {
  const { showHpBoost, setShowHpBoost } = useSelection()
  return { showHpBoost, setShowHpBoost }
}
