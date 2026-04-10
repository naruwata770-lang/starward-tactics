import { describe, expect, it } from 'vitest'

import {
  UNIT_COORD_X_MAX,
  UNIT_COORD_X_MIN,
  UNIT_COORD_Y_MAX,
  UNIT_COORD_Y_MIN,
  UNIT_LABEL_GAP,
  UNIT_LABEL_HEIGHT,
  UNIT_LABEL_STROKE_WIDTH,
  UNIT_RADIUS,
  UNIT_STROKE_WIDTH,
  VIEW_BOX_SIZE,
} from '../constants/board'
import { INITIAL_BOARD_STATE } from '../constants/game'
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
      // 検証の対象: 現行の描画で viewBox 端を支配する 4 辺のみ。
      // - x 方向: 円の半径 (30) + stroke 半幅 (1) = 31 が、ラベル幅の半分
      //   (UNIT_LABEL_WIDTH / 2 + UNIT_LABEL_STROKE_WIDTH / 2 = 28.5) より大きい
      //   ため、x の左右は円が支配する。よってラベル左右の assertion は省略。
      // - y 方向: 上は円が、下はラベルが支配する。
      //
      // 将来 UNIT_LABEL_WIDTH を UNIT_RADIUS * 2 + UNIT_STROKE_WIDTH より大きく
      // 変更するとラベル左右が viewBox 端を支配するようになるので、その時は
      // 下記に「ラベル左端 / 右端」の assertion を追加し、UNIT_COORD_X_MIN/MAX
      // の式もラベル幅を加味するよう更新すること。
      const strokeHalf = UNIT_STROKE_WIDTH / 2
      const labelStrokeHalf = UNIT_LABEL_STROKE_WIDTH / 2

      // 円の左端 (x_min での)
      expect(UNIT_COORD_X_MIN - UNIT_RADIUS - strokeHalf).toBeGreaterThanOrEqual(0)
      // 円の右端 (x_max での)
      expect(UNIT_COORD_X_MAX + UNIT_RADIUS + strokeHalf).toBeLessThanOrEqual(
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
    it('updates cost', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'SET_COST',
        unitId: 'self',
        cost: 2.5,
      })
      expect(next.units.self.cost).toBe(2.5)
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
