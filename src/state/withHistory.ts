/**
 * Undo/Redo の history を扱う reducer ラッパー。
 *
 * 設計判断:
 * - past/present/future の3配列で履歴管理（一般的なパターン）
 * - HISTORY_LIMIT で過去を切り捨て、メモリリーク防止
 * - ドラッグ中は MOVE_UNIT で present だけ更新し、ロック線などの派生 UI が
 *   グローバル state を見て自然に追従できるようにする
 * - ドラッグ開始時 (= 初回 MOVE_UNIT) に "uncommittedFrom" にスナップを取り、
 *   COMMIT_MOVE でこれを past に積むことで「1 ドラッグ = 1 履歴」を実現する
 * - LOAD_STATE / RESET は履歴を完全クリア（過去に戻る道筋を絶つ）
 * - 新しい action が走ると future はクリア（標準的な undo/redo の挙動）
 */

import type { BoardAction, BoardState } from '../types/board'

export interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
  /**
   * @internal
   * ドラッグ中の transient state。
   * - MOVE_UNIT が初めて呼ばれた時点の present のスナップショット
   * - COMMIT_MOVE / 通常 action / LOAD_STATE / RESET / UNDO / REDO で null に戻る
   * - Undo の復帰先として使われる（mid-drag undo はこれに戻る）
   * - 通常コンシューマは触らない
   */
  uncommittedFrom: T | null
}

export const DEFAULT_HISTORY_LIMIT = 50

export interface WithHistoryOptions {
  /** 履歴の上限。デフォルト 50。テストで小さな値を注入できるようにオプション化 */
  limit?: number
}

const RESETTING: ReadonlySet<BoardAction['type']> = new Set([
  'LOAD_STATE',
  'RESET',
])

export function createInitialHistory(
  present: BoardState,
): HistoryState<BoardState> {
  return { past: [], present, future: [], uncommittedFrom: null }
}

export function withHistory(
  reducer: (state: BoardState, action: BoardAction) => BoardState,
  options: WithHistoryOptions = {},
) {
  // 負値や 0 を渡されたときに slice(-0) で全件残ってしまうのを防ぐ
  const limit = Math.max(0, options.limit ?? DEFAULT_HISTORY_LIMIT)

  return function historyReducer(
    state: HistoryState<BoardState>,
    action: BoardAction,
  ): HistoryState<BoardState> {
    if (action.type === 'UNDO') {
      // ドラッグ中の Undo はドラッグをキャンセルしてスナップに戻る（past は触らない）
      if (state.uncommittedFrom !== null) {
        // すでに開始位置と同じ参照を見ている場合はオブジェクト再生成しない
        if (state.present === state.uncommittedFrom) {
          return { ...state, uncommittedFrom: null }
        }
        return {
          ...state,
          present: state.uncommittedFrom,
          uncommittedFrom: null,
        }
      }
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      // 参照同一性チェック: 無駄な再 render を避ける
      if (previous === state.present) return state
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        uncommittedFrom: null,
      }
    }

    if (action.type === 'REDO') {
      // ドラッグ中の Redo は意味がないので no-op
      if (state.uncommittedFrom !== null) return state
      if (state.future.length === 0) return state
      const [next, ...rest] = state.future
      // 参照同一性チェック
      if (next === state.present) return state
      return {
        past: [...state.past, state.present],
        present: next,
        future: rest,
        uncommittedFrom: null,
      }
    }

    if (RESETTING.has(action.type)) {
      const newPresent = reducer(state.present, action)
      return { past: [], present: newPresent, future: [], uncommittedFrom: null }
    }

    const newPresent = reducer(state.present, action)

    // MOVE_UNIT: 履歴に積まず present だけ更新。初回ならスナップを取る
    if (action.type === 'MOVE_UNIT') {
      if (newPresent === state.present) return state
      return {
        ...state,
        present: newPresent,
        uncommittedFrom: state.uncommittedFrom ?? state.present,
      }
    }

    // COMMIT_MOVE: ドラッグ完了。uncommittedFrom があればそれを past に積む
    if (action.type === 'COMMIT_MOVE') {
      if (state.uncommittedFrom === null) {
        // ドラッグなしの単発 COMMIT_MOVE: 通常 action と同じ扱い
        if (newPresent === state.present) return state
        return appendToPast(state, newPresent, limit)
      }

      // mid-drag commit: 開始位置と終了位置を比較して history 記録要否を判定
      // NOTE: 「1 ドラッグ = 1 ユニットしか動かさない」前提。マルチタッチで複数ユニットを
      // 同時にドラッグするような将来拡張をする場合は、この等価判定では足りない
      // (他のユニットの変更が silent に捨てられる) ので拡張要。
      const startUnit = state.uncommittedFrom.units[action.unitId]
      const newUnit = newPresent.units[action.unitId]
      if (startUnit.x === newUnit.x && startUnit.y === newUnit.y) {
        // 結果的に開始位置と同じ → 履歴は積まず uncommittedFrom にスナップバック
        // (present の参照を uncommittedFrom に戻すことで余計な再 render を防ぐ)
        return {
          ...state,
          present: state.uncommittedFrom,
          uncommittedFrom: null,
        }
      }

      // 開始位置と異なる: uncommittedFrom (= 開始時の state) を past に積む
      return {
        past: trimHistory([...state.past, state.uncommittedFrom], limit),
        present: newPresent,
        future: [],
        uncommittedFrom: null,
      }
    }

    // 通常の action (SET_DIRECTION / SET_COST / ...)
    if (newPresent === state.present) return state

    // mid-drag に SET_* が来た場合 (UI 上は発生しないはずの corner case):
    // uncommittedFrom を baseline として history に積む
    const baseline = state.uncommittedFrom ?? state.present
    return {
      past: trimHistory([...state.past, baseline], limit),
      present: newPresent,
      future: [],
      uncommittedFrom: null,
    }
  }
}

function appendToPast(
  state: HistoryState<BoardState>,
  newPresent: BoardState,
  limit: number,
): HistoryState<BoardState> {
  return {
    past: trimHistory([...state.past, state.present], limit),
    present: newPresent,
    future: [],
    uncommittedFrom: null,
  }
}

function trimHistory<T>(past: T[], limit: number): T[] {
  if (limit <= 0) return []
  return past.length > limit ? past.slice(-limit) : past
}
