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
import { BOOST_MAX, INITIAL_BOARD_STATE } from '../constants/game'
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
      // characterId が string なら lookup → cost / hp を自動同期 (1 アクション = Undo 1 単位)。
      // 未知 id (lookup miss) は **no-op** で state を破壊しない (PR #63 [共通中] 反映)。
      //
      // Issue #58: hp の同期挙動を追加:
      // - characterId が string になる / 別機体に変わる → hp = character.maxHp (Codex/Gemini[共通・高] 反映)
      // - characterId が null になる → hp = null (HP 表示不能)
      // cost は characterId=null 時は据え置き (機体解除後も最後の cost が残る既存挙動)。
      //
      // 「hp 残量を引き継がない」理由: 機体ごとに maxHp が違うため、旧 hp の絶対値を残すと
      // 「Hikari の 480 残り」のような矛盾値が出る。reset の方が予測しやすい。
      const character = findCharacterById(action.characterId)
      if (action.characterId !== null && character === null) {
        return state
      }
      const patch: Partial<Unit> =
        character !== null
          ? { characterId: character.id, cost: character.cost, hp: character.maxHp }
          : { characterId: null, hp: null }
      return updateUnit(state, action.unitId, patch)
    }

    case 'SET_HP': {
      // Issue #58: HP の編集。
      //
      // 不変条件: characterId と hp は常に同期する (#58 レビュー[共通] 反映):
      // - characterId === null → hp = null 固定 (HP 表示不能)
      // - characterId !== null → hp は number (0..maxHp)
      //
      // この不変条件を保つため、機体未選択中の SET_HP は no-op (UI 経路で防がれているはずだが防御)。
      // `hp = null` を直接設定する経路は SET_HP には存在しない (型レベルで number に絞り込み済み)。
      // 機体解除に伴う hp=null 化は SET_CHARACTER 側で行う (仕様源泉の単一化; Codex レビュー指摘反映)。
      const unit = state.units[action.unitId]
      if (unit.characterId === null) return state
      const character = findCharacterById(unit.characterId)
      if (character === null) return state
      if (!Number.isFinite(action.hp)) return state
      const clamped = Math.max(0, Math.min(character.maxHp, Math.round(action.hp)))
      return updateUnit(state, action.unitId, { hp: clamped })
    }

    case 'SET_BOOST': {
      // Issue #58: Boost の編集。0..100 に clamp + 整数化。
      if (!Number.isFinite(action.boost)) return state
      const clamped = Math.max(0, Math.min(BOOST_MAX, Math.round(action.boost)))
      return updateUnit(state, action.unitId, { boost: clamped })
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
