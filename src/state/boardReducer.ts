/**
 * ボード状態の pure reducer。
 *
 * Undo/Redo は withHistory ラッパーで扱うため、ここでは UNDO/REDO は処理しない。
 */

import { INITIAL_BOARD_STATE } from '../constants/game'
import type { BoardAction, BoardState, Unit, UnitId } from '../types/board'

function updateUnit(
  state: BoardState,
  unitId: UnitId,
  patch: Partial<Unit>,
): BoardState {
  const current = state.units[unitId]
  // 同じ値しか入らない場合は state 参照を変えない（Context の不要な再 render を抑える）
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
      return updateUnit(state, action.unitId, { x: action.x, y: action.y })

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
