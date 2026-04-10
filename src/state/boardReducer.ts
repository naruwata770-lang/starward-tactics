/**
 * ボード状態の pure reducer。
 *
 * Undo/Redo は withHistory ラッパーで扱うため、ここでは UNDO/REDO は処理しない。
 */

import {
  UNIT_COORD_X_MAX,
  UNIT_COORD_X_MIN,
  UNIT_COORD_Y_MAX,
  UNIT_COORD_Y_MIN,
} from '../constants/board'
import { INITIAL_BOARD_STATE } from '../constants/game'
import type { BoardAction, BoardState, Unit, UnitId } from '../types/board'

/**
 * 中心座標のクランプ範囲は constants/board.ts に集約している。
 * 範囲は「円とラベルが viewBox 内に収まる」ように描画サイズぶんマージンを取った
 * 安全範囲で、x/y の上下限が非対称なのはラベルが円の下に出る分だけ y 上限が
 * 厳しくなるため。
 */
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.max(min, Math.min(max, value))
}

/**
 * 単一ユニットを更新する。
 *
 * 注: shallow compare はプリミティブ前提。Unit 型に object/array フィールドが
 * 追加された場合、参照比較が常に false になり「変更なし」を検出できなくなる。
 * その場合は等価判定をフィールドごとにカスタマイズする必要がある。
 */
function updateUnit(
  state: BoardState,
  unitId: UnitId,
  patch: Partial<Unit>,
): BoardState {
  const current = state.units[unitId]
  let changed = false
  for (const key of Object.keys(patch) as (keyof Unit)[]) {
    if (current[key] !== patch[key]) {
      changed = true
      break
    }
  }
  if (!changed) return state

  return {
    units: {
      ...state.units,
      [unitId]: { ...current, ...patch },
    },
  }
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'MOVE_UNIT':
    case 'COMMIT_MOVE':
      return updateUnit(state, action.unitId, {
        x: clamp(action.x, UNIT_COORD_X_MIN, UNIT_COORD_X_MAX),
        y: clamp(action.y, UNIT_COORD_Y_MIN, UNIT_COORD_Y_MAX),
      })

    case 'SET_DIRECTION':
      return updateUnit(state, action.unitId, { direction: action.direction })

    case 'SET_COST':
      return updateUnit(state, action.unitId, { cost: action.cost })

    case 'SET_STARBURST':
      return updateUnit(state, action.unitId, { starburst: action.level })

    case 'SET_CORE_TYPE':
      return updateUnit(state, action.unitId, { coreType: action.coreType })

    case 'SET_LOCK_TARGET':
      // 自分自身ロックは無効
      if (action.target === action.unitId) return state
      return updateUnit(state, action.unitId, { lockTarget: action.target })

    case 'LOAD_STATE':
      // NOTE: 型レベルでしかバリデーションしていない。
      // 信頼できないソース (URL など) からの呼び出しは Phase 5 (urlCodec) 側で
      // 構造・値の検証を済ませてから dispatch すること。
      return action.state

    case 'RESET':
      return INITIAL_BOARD_STATE

    // UNDO / REDO は withHistory 側で処理する
    case 'UNDO':
    case 'REDO':
      return state

    default: {
      // 網羅性チェック: 新しい action type を追加し忘れたら型エラーになる
      const _exhaustive: never = action
      void _exhaustive
      return state
    }
  }
}
