/**
 * Undo/Redo の history を扱う reducer ラッパー。
 *
 * 設計判断:
 * - past/present/future の3配列で履歴管理（一般的なパターン）
 * - HISTORY_LIMIT で過去を切り捨て、メモリリーク防止
 * - MOVE_UNIT のようなドラッグ中の連続更新は履歴に積まない（NON_HISTORICAL）
 * - LOAD_STATE / RESET は履歴を完全クリア（過去に戻る道筋を絶つ）
 * - 新しい action が走ると future はクリア（標準的な undo/redo の挙動）
 */

import type { BoardAction, BoardState } from '../types/board'

export interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

export const HISTORY_LIMIT = 50

/**
 * 履歴に積まない action 種別。
 * ドラッグ中の MOVE_UNIT を 1 履歴 = 1 ピクセルで積みたくないため。
 * ドラッグ完了時は COMMIT_MOVE を発行して履歴に1件だけ残す。
 */
const NON_HISTORICAL: ReadonlySet<BoardAction['type']> = new Set(['MOVE_UNIT'])

/**
 * 履歴を完全クリアする action 種別。
 * URL から状態を読み込んだ時 (LOAD_STATE) や Reset 時は、過去履歴は無効になる。
 */
const RESETTING: ReadonlySet<BoardAction['type']> = new Set(['LOAD_STATE', 'RESET'])

export function createInitialHistory(present: BoardState): HistoryState<BoardState> {
  return { past: [], present, future: [] }
}

export function withHistory(
  reducer: (state: BoardState, action: BoardAction) => BoardState,
) {
  return function historyReducer(
    state: HistoryState<BoardState>,
    action: BoardAction,
  ): HistoryState<BoardState> {
    if (action.type === 'UNDO') {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      }
    }

    if (action.type === 'REDO') {
      if (state.future.length === 0) return state
      const [next, ...rest] = state.future
      return {
        past: [...state.past, state.present],
        present: next,
        future: rest,
      }
    }

    if (RESETTING.has(action.type)) {
      const newPresent = reducer(state.present, action)
      return { past: [], present: newPresent, future: [] }
    }

    const newPresent = reducer(state.present, action)
    if (newPresent === state.present) return state

    if (NON_HISTORICAL.has(action.type)) {
      // 履歴は積まず present だけ更新
      return { ...state, present: newPresent }
    }

    // 通常の action: past に積み、future はクリア
    const past = [...state.past, state.present]
    const trimmed = past.length > HISTORY_LIMIT ? past.slice(-HISTORY_LIMIT) : past
    return { past: trimmed, present: newPresent, future: [] }
  }
}
