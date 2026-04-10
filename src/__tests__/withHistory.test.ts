import { describe, expect, it } from 'vitest'

import { INITIAL_BOARD_STATE } from '../constants/game'
import { boardReducer } from '../state/boardReducer'
import {
  DEFAULT_HISTORY_LIMIT,
  createInitialHistory,
  withHistory,
} from '../state/withHistory'
import type { BoardAction, BoardState } from '../types/board'

const historicalReducer = withHistory(boardReducer)

function initial() {
  return createInitialHistory(INITIAL_BOARD_STATE)
}

function dispatch(
  state: ReturnType<typeof initial>,
  ...actions: BoardAction[]
) {
  return actions.reduce((s, a) => historicalReducer(s, a), state)
}

describe('withHistory', () => {
  describe('SET_* actions', () => {
    it('records history on SET_DIRECTION', () => {
      const next = dispatch(initial(), {
        type: 'SET_DIRECTION',
        unitId: 'self',
        direction: 90,
      })
      expect(next.past).toHaveLength(1)
      expect(next.past[0]).toBe(INITIAL_BOARD_STATE)
      expect(next.present.units.self.direction).toBe(90)
      expect(next.uncommittedFrom).toBeNull()
    })

    it('records history on SET_COST', () => {
      const next = dispatch(initial(), {
        type: 'SET_COST',
        unitId: 'self',
        cost: 2,
      })
      expect(next.past).toHaveLength(1)
      expect(next.present.units.self.cost).toBe(2)
    })
  })

  describe('drag flow (MOVE_UNIT + COMMIT_MOVE)', () => {
    it('MOVE_UNIT does NOT push to past', () => {
      const next = dispatch(
        initial(),
        { type: 'MOVE_UNIT', unitId: 'self', x: 50, y: 50 },
        { type: 'MOVE_UNIT', unitId: 'self', x: 100, y: 100 },
        { type: 'MOVE_UNIT', unitId: 'self', x: 150, y: 150 },
      )
      expect(next.past).toHaveLength(0)
      expect(next.present.units.self.x).toBe(150)
    })

    it('first MOVE_UNIT snapshots uncommittedFrom', () => {
      const next = dispatch(initial(), {
        type: 'MOVE_UNIT',
        unitId: 'self',
        x: 50,
        y: 50,
      })
      expect(next.uncommittedFrom).toBe(INITIAL_BOARD_STATE)
    })

    it('subsequent MOVE_UNIT keeps the original snapshot', () => {
      const next = dispatch(
        initial(),
        { type: 'MOVE_UNIT', unitId: 'self', x: 50, y: 50 },
        { type: 'MOVE_UNIT', unitId: 'self', x: 100, y: 100 },
      )
      expect(next.uncommittedFrom).toBe(INITIAL_BOARD_STATE)
    })

    it('drag flow: many MOVE_UNIT then COMMIT_MOVE = 1 history entry pointing to PRE-DRAG state', () => {
      const next = dispatch(
        initial(),
        { type: 'MOVE_UNIT', unitId: 'self', x: 50, y: 50 },
        { type: 'MOVE_UNIT', unitId: 'self', x: 100, y: 100 },
        { type: 'COMMIT_MOVE', unitId: 'self', x: 150, y: 150 },
      )
      expect(next.past).toHaveLength(1)
      // 重要: past[0] はドラッグ開始前の state（途中の transient ではない）
      expect(next.past[0]).toBe(INITIAL_BOARD_STATE)
      expect(next.present.units.self.x).toBe(150)
      expect(next.present.units.self.y).toBe(150)
      expect(next.uncommittedFrom).toBeNull()
    })

    it('UNDO after a drag restores to PRE-DRAG state (regression test)', () => {
      // Codex のレビューで指摘されたバグの再現テスト:
      // 旧実装では UNDO 後の present が中間の transient state (100, 100) になっていた
      const next = dispatch(
        initial(),
        { type: 'MOVE_UNIT', unitId: 'self', x: 50, y: 50 },
        { type: 'MOVE_UNIT', unitId: 'self', x: 100, y: 100 },
        { type: 'COMMIT_MOVE', unitId: 'self', x: 150, y: 150 },
        { type: 'UNDO' },
      )
      expect(next.present.units.self.x).toBe(
        INITIAL_BOARD_STATE.units.self.x,
      )
      expect(next.present.units.self.y).toBe(
        INITIAL_BOARD_STATE.units.self.y,
      )
    })

    it('mid-drag UNDO cancels the drag without touching past', () => {
      const before = dispatch(
        initial(),
        { type: 'SET_COST', unitId: 'self', cost: 2 },
      )
      // ここでドラッグ開始
      const dragging = dispatch(
        before,
        { type: 'MOVE_UNIT', unitId: 'self', x: 50, y: 50 },
        { type: 'MOVE_UNIT', unitId: 'self', x: 100, y: 100 },
      )
      // mid-drag UNDO
      const cancelled = dispatch(dragging, { type: 'UNDO' })
      expect(cancelled.past).toEqual(before.past)
      expect(cancelled.future).toHaveLength(0)
      expect(cancelled.uncommittedFrom).toBeNull()
      // ドラッグ開始時点に戻る (cost=2 は維持される)
      expect(cancelled.present.units.self.cost).toBe(2)
      expect(cancelled.present.units.self.x).toBe(
        INITIAL_BOARD_STATE.units.self.x,
      )
    })

    it('drag and release at start position: no history entry', () => {
      const original = INITIAL_BOARD_STATE.units.self
      const next = dispatch(
        initial(),
        { type: 'MOVE_UNIT', unitId: 'self', x: 100, y: 100 },
        { type: 'COMMIT_MOVE', unitId: 'self', x: original.x, y: original.y },
      )
      expect(next.past).toHaveLength(0)
      expect(next.uncommittedFrom).toBeNull()
      expect(next.present).toBe(INITIAL_BOARD_STATE)
    })

    it('SET_* during drag uses uncommittedFrom as baseline', () => {
      // UI 上は起こらないはずの corner case だが、データモデルとして正しく扱う
      const next = dispatch(
        initial(),
        { type: 'MOVE_UNIT', unitId: 'self', x: 100, y: 100 },
        { type: 'SET_DIRECTION', unitId: 'self', direction: 90 },
      )
      expect(next.past).toHaveLength(1)
      expect(next.past[0]).toBe(INITIAL_BOARD_STATE)
      expect(next.uncommittedFrom).toBeNull()
    })
  })

  describe('UNDO / REDO', () => {
    it('UNDO restores previous state', () => {
      const after = dispatch(
        initial(),
        { type: 'SET_COST', unitId: 'self', cost: 2 },
        { type: 'UNDO' },
      )
      expect(after.present).toBe(INITIAL_BOARD_STATE)
      expect(after.future).toHaveLength(1)
      expect(after.past).toHaveLength(0)
    })

    it('REDO replays the undone action', () => {
      const after = dispatch(
        initial(),
        { type: 'SET_COST', unitId: 'self', cost: 2 },
        { type: 'UNDO' },
        { type: 'REDO' },
      )
      expect(after.present.units.self.cost).toBe(2)
      expect(after.future).toHaveLength(0)
    })

    it('UNDO is a no-op when past is empty', () => {
      const start = initial()
      const next = dispatch(start, { type: 'UNDO' })
      expect(next).toBe(start)
    })

    it('REDO is a no-op when future is empty', () => {
      const start = initial()
      const next = dispatch(start, { type: 'REDO' })
      expect(next).toBe(start)
    })

    it('multiple UNDO preserves correct future order (FIFO replay)', () => {
      // 3 つの action を記録 → 3 回 UNDO → 3 回 REDO で元に戻ること
      const recorded = dispatch(
        initial(),
        { type: 'SET_COST', unitId: 'self', cost: 2 },
        { type: 'SET_COST', unitId: 'self', cost: 2.5 },
        { type: 'SET_COST', unitId: 'self', cost: 1.5 },
      )
      expect(recorded.present.units.self.cost).toBe(1.5)

      const undone = dispatch(
        recorded,
        { type: 'UNDO' },
        { type: 'UNDO' },
        { type: 'UNDO' },
      )
      expect(undone.present).toBe(INITIAL_BOARD_STATE)
      expect(undone.future).toHaveLength(3)

      const redone = dispatch(
        undone,
        { type: 'REDO' },
        { type: 'REDO' },
        { type: 'REDO' },
      )
      expect(redone.present.units.self.cost).toBe(1.5)
      expect(redone.future).toHaveLength(0)
    })

    it('new action clears the future stack', () => {
      const next = dispatch(
        initial(),
        { type: 'SET_COST', unitId: 'self', cost: 2 },
        { type: 'UNDO' },
        { type: 'SET_COST', unitId: 'self', cost: 2.5 },
      )
      expect(next.future).toHaveLength(0)
      expect(next.present.units.self.cost).toBe(2.5)
    })
  })

  describe('LOAD_STATE / RESET', () => {
    it('LOAD_STATE clears history entirely', () => {
      const newPresent: BoardState = {
        units: {
          ...INITIAL_BOARD_STATE.units,
          self: { ...INITIAL_BOARD_STATE.units.self, x: 1 },
        },
      }
      const next = dispatch(
        initial(),
        { type: 'SET_COST', unitId: 'self', cost: 2 },
        { type: 'SET_DIRECTION', unitId: 'self', direction: 90 },
        { type: 'LOAD_STATE', state: newPresent },
      )
      expect(next.past).toHaveLength(0)
      expect(next.future).toHaveLength(0)
      expect(next.uncommittedFrom).toBeNull()
      expect(next.present).toBe(newPresent)
    })

    it('RESET clears history entirely', () => {
      const next = dispatch(
        initial(),
        { type: 'SET_COST', unitId: 'self', cost: 2 },
        { type: 'RESET' },
      )
      expect(next.past).toHaveLength(0)
      expect(next.future).toHaveLength(0)
      expect(next.uncommittedFrom).toBeNull()
      expect(next.present).toBe(INITIAL_BOARD_STATE)
    })
  })

  describe('history limit', () => {
    it('respects custom limit option', () => {
      const reducer = withHistory(boardReducer, { limit: 3 })
      let state = createInitialHistory(INITIAL_BOARD_STATE)
      for (let i = 0; i < 10; i++) {
        state = reducer(state, {
          type: 'COMMIT_MOVE',
          unitId: 'self',
          x: i + 1,
          y: 0,
        })
      }
      expect(state.past).toHaveLength(3)
    })

    it('default limit equals DEFAULT_HISTORY_LIMIT', () => {
      let state = initial()
      for (let i = 0; i < DEFAULT_HISTORY_LIMIT + 5; i++) {
        state = historicalReducer(state, {
          type: 'COMMIT_MOVE',
          unitId: 'self',
          x: i + 1,
          y: 0,
        })
      }
      expect(state.past).toHaveLength(DEFAULT_HISTORY_LIMIT)
      expect(state.present.units.self.x).toBe(DEFAULT_HISTORY_LIMIT + 5)
    })

    it('limit: 0 keeps no history (regression: slice(-0) bug)', () => {
      const reducer = withHistory(boardReducer, { limit: 0 })
      const next = reducer(createInitialHistory(INITIAL_BOARD_STATE), {
        type: 'COMMIT_MOVE',
        unitId: 'self',
        x: 100,
        y: 100,
      })
      expect(next.past).toHaveLength(0)
      expect(next.present.units.self.x).toBe(100)
    })

    it('negative limit is treated as 0', () => {
      const reducer = withHistory(boardReducer, { limit: -5 })
      const next = reducer(createInitialHistory(INITIAL_BOARD_STATE), {
        type: 'COMMIT_MOVE',
        unitId: 'self',
        x: 100,
        y: 100,
      })
      expect(next.past).toHaveLength(0)
    })
  })

  describe('reference identity', () => {
    it('returns same state when reducer returns same state', () => {
      const start = initial()
      const next = historicalReducer(start, {
        type: 'SET_LOCK_TARGET',
        unitId: 'self',
        target: 'self',
      })
      expect(next).toBe(start)
    })
  })
})
