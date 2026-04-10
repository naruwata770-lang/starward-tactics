/**
 * BoardProvider: ボード状態と UI 状態を子コンポーネントに提供する。
 *
 * Context オブジェクトと購読 hooks は BoardContext.ts に定義。
 * このファイルは Fast Refresh の制約 (react-refresh/only-export-components)
 * を満たすため、コンポーネントのみを export している。
 */

import {
  useCallback,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react'

import { INITIAL_BOARD_STATE } from '../constants/game'
import type { BoardState, UnitId } from '../types/board'
import {
  BoardDispatchContext,
  BoardStateContext,
  UIContext,
  type UIContextValue,
} from './BoardContext'
import { boardReducer } from './boardReducer'
import { createInitialHistory, withHistory } from './withHistory'

const historicalReducer = withHistory(boardReducer)

export interface BoardProviderProps {
  children: ReactNode
  /** テストや復元用の初期 state。省略時は INITIAL_BOARD_STATE */
  initialState?: BoardState
}

export function BoardProvider({ children, initialState }: BoardProviderProps) {
  const [historyState, dispatch] = useReducer(
    historicalReducer,
    initialState ?? INITIAL_BOARD_STATE,
    createInitialHistory,
  )

  const [selectedUnit, setSelectedUnit] = useState<UnitId | null>(null)

  const setSelectedUnitStable = useCallback((unit: UnitId | null) => {
    setSelectedUnit(unit)
  }, [])

  const uiValue = useMemo<UIContextValue>(
    () => ({ selectedUnit, setSelectedUnit: setSelectedUnitStable }),
    [selectedUnit, setSelectedUnitStable],
  )

  return (
    <BoardStateContext.Provider value={historyState}>
      <BoardDispatchContext.Provider value={dispatch}>
        <UIContext.Provider value={uiValue}>{children}</UIContext.Provider>
      </BoardDispatchContext.Provider>
    </BoardStateContext.Provider>
  )
}
