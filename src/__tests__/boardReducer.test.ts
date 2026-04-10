import { describe, expect, it } from 'vitest'

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

    it('clamps coordinates outside [0, 720]', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'COMMIT_MOVE',
        unitId: 'self',
        x: -100,
        y: 9999,
      })
      expect(next.units.self.x).toBe(0)
      expect(next.units.self.y).toBe(720)
    })

    it('clamps NaN coordinates to 0', () => {
      const next = boardReducer(INITIAL_BOARD_STATE, {
        type: 'COMMIT_MOVE',
        unitId: 'self',
        x: Number.NaN,
        y: Number.NaN,
      })
      expect(next.units.self.x).toBe(0)
      expect(next.units.self.y).toBe(0)
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
