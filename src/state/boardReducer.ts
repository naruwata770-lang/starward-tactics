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
import {
  INITIAL_BOARD_STATE,
  TEAM_REMAINING_COST_MAX,
  TEAM_REMAINING_COST_MIN,
  TEAM_REMAINING_COST_STEP,
} from '../constants/game'
import { findCharacterById } from '../data/characters'
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

  // Issue #60: 新 top-level フィールド (teamRemainingCost 等) を保つため、
  // units だけを差し替える shallow spread で state を作り直す。
  // 以前は `{ units: ... }` で new object を返しており、top-level が追加された
  // 瞬間に既存 action で蒸発する回帰を招くため refactor した。
  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: { ...current, ...patch },
    },
  }
}

/**
 * Issue #60: 残コスト値を 0..6 / 0.5 刻みに正規化する。
 * - Number.isFinite 違反 (NaN / Infinity) は null を返し、呼び出し側で no-op 扱い
 * - clamp 後に 0.5 刻みへ snap
 */
function normalizeTeamCost(value: number): number | null {
  if (!Number.isFinite(value)) return null
  const clamped = Math.max(
    TEAM_REMAINING_COST_MIN,
    Math.min(TEAM_REMAINING_COST_MAX, value),
  )
  return Math.round(clamped / TEAM_REMAINING_COST_STEP) * TEAM_REMAINING_COST_STEP
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

    case 'SET_COST': {
      // characterId 選択中は cost が機体固有値に固定されているため SSOT として変更不可。
      // UI 側でも CostSelector を disabled にしているが、別経路 (将来の bulk action や
      // テスト等) からの dispatch も同じガードで弾く (Issue #55 セカンドオピニオン共通[高])
      if (state.units[action.unitId].characterId !== null) return state
      return updateUnit(state, action.unitId, { cost: action.cost })
    }

    case 'SET_STARBURST':
      return updateUnit(state, action.unitId, { starburst: action.level })

    case 'SET_CORE_TYPE':
      return updateUnit(state, action.unitId, { coreType: action.coreType })

    case 'SET_LOCK_TARGET':
      // 自分自身ロックは無効
      if (action.target === action.unitId) return state
      return updateUnit(state, action.unitId, { lockTarget: action.target })

    case 'SET_CHARACTER': {
      // characterId が string なら lookup → cost を自動同期 (1 アクション = Undo 1 単位)
      // characterId が null なら cost は据え置き (UX 罠の認識: 機体解除後も機体固有 cost が残る。
      // Issue #55 セカンドオピニオン Codex 中 反映: コメントで明示)
      // 未知 id (lookup miss) は **no-op** で state を破壊しない (PR #63 [共通中] 反映)。
      // 旧実装は characterId=null に書き戻していたため、既に有効な機体が
      // 選択中だった unit が silent に解除される回帰があった。
      const character = findCharacterById(action.characterId)
      if (action.characterId !== null && character === null) {
        return state
      }
      const patch: Partial<Unit> =
        character !== null
          ? { characterId: character.id, cost: character.cost }
          : { characterId: null }
      return updateUnit(state, action.unitId, patch)
    }

    case 'SET_TEAM_REMAINING_COST': {
      const normalized = normalizeTeamCost(action.value)
      if (normalized === null) return state
      if (state.teamRemainingCost[action.team] === normalized) return state
      return {
        ...state,
        teamRemainingCost: {
          ...state.teamRemainingCost,
          [action.team]: normalized,
        },
      }
    }

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
