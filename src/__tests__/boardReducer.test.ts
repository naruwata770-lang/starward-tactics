import { describe, expect, it } from 'vitest'

import {
  UNIT_COORD_X_MAX,
  UNIT_COORD_X_MIN,
  UNIT_COORD_Y_MAX,
  UNIT_COORD_Y_MIN,
  UNIT_LABEL_GAP,
  UNIT_LABEL_HEIGHT,
  UNIT_LABEL_STROKE_WIDTH,
  UNIT_LABEL_WIDTH,
  UNIT_RADIUS,
  UNIT_STROKE_WIDTH,
  VIEW_BOX_SIZE,
} from '../constants/board'
import { INITIAL_BOARD_STATE } from '../constants/game'
import { CHARACTERS } from '../data/characters'
import { boardReducer } from '../state/boardReducer'
import type { BoardState } from '../types/board'

describe('boardReducer', () => {
  describe('MOVE_UNIT / COMMIT_MOVE', () => {
    it('MOVE_UNIT updates position', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'MOVE_UNIT',
        unitId: 'self',
        x: 100,
        y: 200,
      })
      expect(next.units.self.x).toBe(100)
      expect(next.units.self.y).toBe(200)
    })

    it('COMMIT_MOVE updates position the same way', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'COMMIT_MOVE',
        unitId: 'enemy1',
        x: 50,
        y: 60,
      })
      expect(next.units.enemy1.x).toBe(50)
      expect(next.units.enemy1.y).toBe(60)
    })

    it('returns the same reference when position is unchanged', () => {
      const unit = INITIAL_BOARD_STATE.units.self
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'MOVE_UNIT',
        unitId: 'self',
        x: unit.x,
        y: unit.y,
      })
      expect(next).toBe(INITIAL_BOARD_STATE)
    })

    it('does not mutate other units', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'MOVE_UNIT',
        unitId: 'self',
        x: 100,
        y: 100,
      })
      expect(next.units.ally).toBe(INITIAL_BOARD_STATE.units.ally)
      expect(next.units.enemy1).toBe(INITIAL_BOARD_STATE.units.enemy1)
    })

    it('clamps coordinates outside the safe draw range', () => {
      // クランプ範囲は viewBox の生 [0, 720] ではなく、円とラベルが
      // 収まるようマージンを取った範囲 (constants/board.ts)。
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'COMMIT_MOVE',
        unitId: 'self',
        x: -100,
        y: 9999,
      })
      expect(next.units.self.x).toBe(UNIT_COORD_X_MIN)
      expect(next.units.self.y).toBe(UNIT_COORD_Y_MAX)
    })

    it('clamps NaN coordinates to the minimum of the safe range', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'COMMIT_MOVE',
        unitId: 'self',
        x: Number.NaN,
        y: Number.NaN,
      })
      expect(next.units.self.x).toBe(UNIT_COORD_X_MIN)
      expect(next.units.self.y).toBe(UNIT_COORD_Y_MIN)
    })

    it('safe range keeps the visual bounding box within viewBox', () => {
      // 不変条件テスト: UNIT_COORD_*_{MIN,MAX} の境界値で実際に円とラベルを
      // 描画したとき、stroke を含めた視覚 bbox が [0, VIEW_BOX_SIZE] に収まること
      // を計算で検証する。constants/board.ts の式を変更したらここで気づける。
      //
      // Issue #55 で UNIT_LABEL_WIDTH を 56 → 64 に拡張した結果、ラベル幅の半分
      // (32 + 0.5 = 32.5) が円半径 (30 + 1 = 31) を超え、x 方向はラベルが支配する。
      // よってここでは「円端」と「ラベル端」の両方を assert する。
      const strokeHalf = UNIT_STROKE_WIDTH / 2
      const labelStrokeHalf = UNIT_LABEL_STROKE_WIDTH / 2
      const labelHalf = UNIT_LABEL_WIDTH / 2

      // 円の左右端
      expect(UNIT_COORD_X_MIN - UNIT_RADIUS - strokeHalf).toBeGreaterThanOrEqual(0)
      expect(UNIT_COORD_X_MAX + UNIT_RADIUS + strokeHalf).toBeLessThanOrEqual(
        VIEW_BOX_SIZE,
      )
      // ラベルの左右端 (Issue #55 で支配側になった)
      expect(UNIT_COORD_X_MIN - labelHalf - labelStrokeHalf).toBeGreaterThanOrEqual(
        0,
      )
      expect(UNIT_COORD_X_MAX + labelHalf + labelStrokeHalf).toBeLessThanOrEqual(
        VIEW_BOX_SIZE,
      )

      // 円の上端 (y_min での)
      expect(UNIT_COORD_Y_MIN - UNIT_RADIUS - strokeHalf).toBeGreaterThanOrEqual(0)
      // ラベルの下端 (y_max での)
      expect(
        UNIT_COORD_Y_MAX +
          UNIT_RADIUS +
          UNIT_LABEL_GAP +
          UNIT_LABEL_HEIGHT +
          labelStrokeHalf,
      ).toBeLessThanOrEqual(VIEW_BOX_SIZE)
    })
  })

  describe('SET_DIRECTION', () => {
    it('updates direction', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_DIRECTION',
        unitId: 'self',
        direction: 90,
      })
      expect(next.units.self.direction).toBe(90)
    })
  })

  describe('SET_COST', () => {
    it('updates cost when characterId is null', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_COST',
        unitId: 'self',
        cost: 2.5,
      })
      expect(next.units.self.cost).toBe(2.5)
    })

    it('Issue #55: ignores SET_COST when characterId is set (SSOT guard)', () => {
      // characterId 選択中は cost が機体固有値に固定される
      const withChar = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_CHARACTER',
        unitId: 'self',
        characterId: CHARACTERS[0].id,
      })
      const fixedCost = withChar.units.self.cost
      const next = boardReducer(withChar, {
        type: 'SET_COST',
        unitId: 'self',
        cost: 1.5,
      })
      expect(next.units.self.cost).toBe(fixedCost)
      // state 参照が変わらないこと (no-op であることの保証)
      expect(next).toBe(withChar)
    })
  })

  describe('SET_CHARACTER', () => {
    it('sets characterId and auto-syncs cost to character cost', () => {
      const target = CHARACTERS.find((c) => c.cost !== INITIAL_BOARD_STATE.units.self.cost)!
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_CHARACTER',
        unitId: 'self',
        characterId: target.id,
      })
      expect(next.units.self.characterId).toBe(target.id)
      expect(next.units.self.cost).toBe(target.cost)
    })

    it('clearing characterId (null) keeps last cost (no rollback to default)', () => {
      // 機体選択 → 解除 → cost は機体固有値のまま (UX 罠の認識下で許容)
      const target = CHARACTERS.find((c) => c.cost === 2.5)!
      const withChar = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_CHARACTER',
        unitId: 'self',
        characterId: target.id,
      })
      expect(withChar.units.self.cost).toBe(2.5)
      const cleared = boardReducer(withChar, {
        type: 'SET_CHARACTER',
        unitId: 'self',
        characterId: null,
      })
      expect(cleared.units.self.characterId).toBeNull()
      expect(cleared.units.self.cost).toBe(2.5)
    })

    it('unknown characterId from initial null state remains null', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_CHARACTER',
        unitId: 'self',
        characterId: 'totally-unknown-id',
      })
      expect(next.units.self.characterId).toBeNull()
      // state 参照が変わらないこと (no-op であることの保証)
      expect(next).toBe(INITIAL_BOARD_STATE)
    })

    it('PR #63 [共通中]: unknown characterId does NOT silently clear a valid existing selection', () => {
      // 既に有効な機体が選択されている状態で未知 id を投げても、選択は維持される
      const target = CHARACTERS[0]
      const withChar = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_CHARACTER',
        unitId: 'self',
        characterId: target.id,
      })
      expect(withChar.units.self.characterId).toBe(target.id)

      const next = boardReducer(withChar, {
        type: 'SET_CHARACTER',
        unitId: 'self',
        characterId: 'totally-unknown-id',
      })
      // characterId が target.id のまま (silent 解除されていない)
      expect(next.units.self.characterId).toBe(target.id)
      // state 参照が変わらないこと (no-op であることの保証)
      expect(next).toBe(withChar)
    })
  })

  describe('SET_STARBURST', () => {
    it('updates starburst level', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_STARBURST',
        unitId: 'self',
        level: 'half',
      })
      expect(next.units.self.starburst).toBe('half')
    })
  })

  describe('SET_CORE_TYPE', () => {
    it('updates core type', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_CORE_TYPE',
        unitId: 'self',
        coreType: 'F',
      })
      expect(next.units.self.coreType).toBe('F')
    })
  })

  describe('SET_LOCK_TARGET', () => {
    it('sets lock target', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_LOCK_TARGET',
        unitId: 'self',
        target: 'enemy1',
      })
      expect(next.units.self.lockTarget).toBe('enemy1')
    })

    it('clears lock target with null', () => {
      const withLock = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_LOCK_TARGET',
        unitId: 'self',
        target: 'enemy1',
      })
      const cleared = boardReducer(withLock, {
        type: 'SET_LOCK_TARGET',
        unitId: 'self',
        target: null,
      })
      expect(cleared.units.self.lockTarget).toBeNull()
    })

    it('rejects self-targeting', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_LOCK_TARGET',
        unitId: 'self',
        target: 'self',
      })
      expect(next).toBe(INITIAL_BOARD_STATE)
    })
  })

  describe('LOAD_STATE', () => {
    it('replaces state entirely', () => {
      const custom: BoardState = {
        units: {
          ...INITIAL_BOARD_STATE.units,
          self: { ...INITIAL_BOARD_STATE.units.self, x: 999, y: 888 },
        },
        teamRemainingCost: INITIAL_BOARD_STATE.teamRemainingCost,
      }
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'LOAD_STATE',
        state: custom,
      })
      expect(next).toBe(custom)
    })
  })

  describe('RESET', () => {
    it('returns to initial state', () => {
      const moved = boardReducer(INITIAL_BOARD_STATE, {
        type: 'MOVE_UNIT',
        unitId: 'self',
        x: 1,
        y: 2,
      })
      const next = boardReducer(moved, { type: 'RESET' })
      expect(next).toBe(INITIAL_BOARD_STATE)
    })

    it('Issue #60: resets teamRemainingCost to initial (6, 6)', () => {
      const changed = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_TEAM_REMAINING_COST',
        team: 'ally',
        value: 2,
      })
      const next = boardReducer(changed, { type: 'RESET' })
      expect(next.teamRemainingCost).toEqual({ ally: 6, enemy: 6 })
    })
  })

  // Issue #60
  describe('SET_TEAM_REMAINING_COST', () => {
    it('updates ally value in 0.5 step', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_TEAM_REMAINING_COST',
        team: 'ally',
        value: 4.5,
      })
      expect(next.teamRemainingCost.ally).toBe(4.5)
      expect(next.teamRemainingCost.enemy).toBe(6)
    })

    it('clamps values above the max', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_TEAM_REMAINING_COST',
        team: 'enemy',
        value: 9.5,
      })
      expect(next.teamRemainingCost.enemy).toBe(6)
    })

    it('clamps values below the min', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_TEAM_REMAINING_COST',
        team: 'ally',
        value: -3,
      })
      expect(next.teamRemainingCost.ally).toBe(0)
    })

    it('snaps non-0.5 step values (e.g. 3.3 → 3.5)', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_TEAM_REMAINING_COST',
        team: 'ally',
        value: 3.3,
      })
      expect(next.teamRemainingCost.ally).toBe(3.5)
    })

    it('is a no-op for NaN (state reference preserved)', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_TEAM_REMAINING_COST',
        team: 'ally',
        value: Number.NaN,
      })
      expect(next).toBe(INITIAL_BOARD_STATE)
    })

    it('is a no-op when the snapped value equals the current value', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_TEAM_REMAINING_COST',
        team: 'ally',
        value: 6,
      })
      expect(next).toBe(INITIAL_BOARD_STATE)
    })
  })

  // Issue #60: updateUnit が top-level を保つ refactor の不変条件テスト
  describe('top-level field preservation across unit updates', () => {
    it('preserves teamRemainingCost across MOVE_UNIT', () => {
      const withCost = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_TEAM_REMAINING_COST',
        team: 'ally',
        value: 2.5,
      })
      const moved = boardReducer(withCost, {
        type: 'MOVE_UNIT',
        unitId: 'self',
        x: 400,
        y: 400,
      })
      expect(moved.teamRemainingCost).toEqual({ ally: 2.5, enemy: 6 })
    })

    it('preserves teamRemainingCost across SET_COST', () => {
      const withCost = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_TEAM_REMAINING_COST',
        team: 'enemy',
        value: 1,
      })
      const costed = boardReducer(withCost, {
        type: 'SET_COST',
        unitId: 'self',
        cost: 2,
      })
      expect(costed.teamRemainingCost).toEqual({ ally: 6, enemy: 1 })
    })
  })
})
