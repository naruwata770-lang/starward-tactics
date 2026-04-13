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

    it('Issue #58: sets hp to character.maxHp when characterId becomes set', () => {
      const target = CHARACTERS[0]
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_CHARACTER',
        unitId: 'self',
        characterId: target.id,
      })
      expect(next.units.self.hp).toBe(target.maxHp)
    })

    it('Issue #58: changing to a different character resets hp to new maxHp', () => {
      // 1 機目を選択 → HP を中途半端に下げる → 2 機目に切替 → HP は 2 機目の maxHp で reset
      const a = CHARACTERS.find((c) => c.cost === 3)!
      const b = CHARACTERS.find((c) => c.cost === 1.5)!
      const withA = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_CHARACTER',
        unitId: 'self',
        characterId: a.id,
      })
      const withADamaged = boardReducer(withA, {
        type: 'SET_HP',
        unitId: 'self',
        hp: 100,
      })
      expect(withADamaged.units.self.hp).toBe(100)
      const withB = boardReducer(withADamaged, {
        type: 'SET_CHARACTER',
        unitId: 'self',
        characterId: b.id,
      })
      // 旧 hp (100) を引き継がず、b.maxHp で reset (Codex/Gemini[共通・高] 反映)
      expect(withB.units.self.hp).toBe(b.maxHp)
    })

    it('Issue #58: clearing characterId resets hp to null', () => {
      const target = CHARACTERS[0]
      const withChar = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_CHARACTER',
        unitId: 'self',
        characterId: target.id,
      })
      expect(withChar.units.self.hp).toBe(target.maxHp)
      const cleared = boardReducer(withChar, {
        type: 'SET_CHARACTER',
        unitId: 'self',
        characterId: null,
      })
      // characterId=null になったら hp も null に戻る (HP 表示不能)
      expect(cleared.units.self.hp).toBeNull()
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

  describe('SET_HP (Issue #58)', () => {
    function withCharacter() {
      const target = CHARACTERS[0]
      return {
        target,
        state: boardReducer(INITIAL_BOARD_STATE, {
          type: 'SET_CHARACTER',
          unitId: 'self',
          characterId: target.id,
        }),
      }
    }

    it('updates hp when within 0..maxHp', () => {
      const { state } = withCharacter()
      const next = boardReducer(state, { type: 'SET_HP', unitId: 'self', hp: 200 })
      expect(next.units.self.hp).toBe(200)
    })

    it('clamps hp above maxHp to maxHp', () => {
      const { target, state } = withCharacter()
      const next = boardReducer(state, {
        type: 'SET_HP',
        unitId: 'self',
        hp: target.maxHp + 9999,
      })
      expect(next.units.self.hp).toBe(target.maxHp)
    })

    it('clamps negative hp to 0 (撃破状態)', () => {
      const { state } = withCharacter()
      const next = boardReducer(state, { type: 'SET_HP', unitId: 'self', hp: -100 })
      expect(next.units.self.hp).toBe(0)
    })

    it('rounds non-integer hp to the nearest integer', () => {
      const { state } = withCharacter()
      const next = boardReducer(state, { type: 'SET_HP', unitId: 'self', hp: 200.7 })
      expect(next.units.self.hp).toBe(201)
    })

    it('hp=0 (撃破) is preserved as 0, NOT confused with null', () => {
      const { state } = withCharacter()
      const next = boardReducer(state, { type: 'SET_HP', unitId: 'self', hp: 0 })
      expect(next.units.self.hp).toBe(0)
      expect(next.units.self.hp).not.toBeNull()
    })

    it('rejects SET_HP when characterId is null (no-op)', () => {
      // INITIAL_BOARD_STATE の self は characterId=null
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_HP',
        unitId: 'self',
        hp: 300,
      })
      expect(next).toBe(INITIAL_BOARD_STATE)
    })

    it('SET_HP の型は number 固定: hp=null を直接設定する経路は無い (Codex レビュー指摘反映)', () => {
      // 仕様源泉の単一化: 機体解除時の hp=null 化は SET_CHARACTER 経由のみ。
      // SET_HP は number 専用なので、ここでは「characterId=null + SET_CHARACTER で
      // hp が null になる」を verify する (SET_HP では到達不能になったことを暗示)。
      const target = CHARACTERS[0]
      const withChar = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_CHARACTER',
        unitId: 'self',
        characterId: target.id,
      })
      expect(withChar.units.self.hp).toBe(target.maxHp)
      const cleared = boardReducer(withChar, {
        type: 'SET_CHARACTER',
        unitId: 'self',
        characterId: null,
      })
      expect(cleared.units.self.hp).toBeNull()
    })

    it('rejects non-finite hp (NaN, Infinity) as no-op', () => {
      const { state } = withCharacter()
      const naned = boardReducer(state, { type: 'SET_HP', unitId: 'self', hp: Number.NaN })
      expect(naned).toBe(state)
      const infed = boardReducer(state, {
        type: 'SET_HP',
        unitId: 'self',
        hp: Number.POSITIVE_INFINITY,
      })
      expect(infed).toBe(state)
    })
  })

  describe('SET_BOOST (Issue #58)', () => {
    it('updates boost within 0..100', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_BOOST',
        unitId: 'self',
        boost: 75,
      })
      expect(next.units.self.boost).toBe(75)
    })

    it('clamps boost above 100 to 100', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_BOOST',
        unitId: 'self',
        boost: 250,
      })
      expect(next.units.self.boost).toBe(100)
    })

    it('clamps negative boost to 0', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_BOOST',
        unitId: 'self',
        boost: -10,
      })
      expect(next.units.self.boost).toBe(0)
    })

    it('rounds non-integer boost', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_BOOST',
        unitId: 'self',
        boost: 33.6,
      })
      expect(next.units.self.boost).toBe(34)
    })

    it('rejects non-finite boost', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_BOOST',
        unitId: 'self',
        boost: Number.NaN,
      })
      expect(next).toBe(INITIAL_BOARD_STATE)
    })

    it('SET_BOOST works regardless of characterId (boost is character-independent)', () => {
      // characterId=null でも boost は更新できる (boost は機体不問)
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_BOOST',
        unitId: 'self',
        boost: 50,
      })
      expect(next.units.self.boost).toBe(50)
      expect(next.units.self.characterId).toBeNull()
    })
  })

  describe('LOAD_STATE', () => {
    it('replaces state entirely', () => {
      const custom: BoardState = {
        units: {
          ...INITIAL_BOARD_STATE.units,
          self: { ...INITIAL_BOARD_STATE.units.self, x: 999, y: 888 },
        },
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
  })

})
