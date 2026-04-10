import { describe, expect, it } from 'vitest'

import { INITIAL_BOARD_STATE } from '../constants/game'
import { boardReducer } from '../state/boardReducer'
import {
  HISTORY_LIMIT,
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
  it('records history on COMMIT_MOVE', () => {
    const next = dispatch(initial(), {
      type: 'COMMIT_MOVE',
      unitId: 'self',
      x: 100,
      y: 100,
    })
    expect(next.past).toHaveLength(1)
    expect(next.past[0]).toBe(INITIAL_BOARD_STATE)
    expect(next.present.units.self.x).toBe(100)
    expect(next.future).toHaveLength(0)
  })

  it('does NOT record history on MOVE_UNIT (drag intermediate)', () => {
    const next = dispatch(
      initial(),
      { type: 'MOVE_UNIT', unitId: 'self', x: 50, y: 50 },
      { type: 'MOVE_UNIT', unitId: 'self', x: 100, y: 100 },
      { type: 'MOVE_UNIT', unitId: 'self', x: 150, y: 150 },
    )
    expect(next.past).toHaveLength(0)
    expect(next.present.units.self.x).toBe(150)
    expect(next.present.units.self.y).toBe(150)
  })

  it('drag flow: many MOVE_UNIT then one COMMIT_MOVE = 1 history entry', () => {
    const next = dispatch(
      initial(),
      { type: 'MOVE_UNIT', unitId: 'self', x: 50, y: 50 },
      { type: 'MOVE_UNIT', unitId: 'self', x: 100, y: 100 },
      { type: 'COMMIT_MOVE', unitId: 'self', x: 150, y: 150 },
    )
    expect(next.past).toHaveLength(1)
    expect(next.present.units.self.x).toBe(150)
  })

  it('records history on SET_DIRECTION', () => {
    const next = dispatch(initial(), {
      type: 'SET_DIRECTION',
      unitId: 'self',
      direction: 90,
    })
    expect(next.past).toHaveLength(1)
    expect(next.present.units.self.direction).toBe(90)
  })

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
    expect(next.present).toBe(INITIAL_BOARD_STATE)
  })

  it('limits history to HISTORY_LIMIT entries', () => {
    let state = initial()
    // HISTORY_LIMIT + 5 回 commit を発行
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      state = historicalReducer(state, {
        type: 'COMMIT_MOVE',
        unitId: 'self',
        x: i,
        y: 0,
      })
    }
    expect(state.past.length).toBe(HISTORY_LIMIT)
    // 古いものから削除されているはず
    expect(state.present.units.self.x).toBe(HISTORY_LIMIT + 4)
  })

  it('returns same state when reducer returns same state (e.g. self-lock rejected)', () => {
    const start = initial()
    const next = historicalReducer(start, {
      type: 'SET_LOCK_TARGET',
      unitId: 'self',
      target: 'self',
    })
    expect(next).toBe(start)
    expect(next.past).toHaveLength(0)
  })
})
