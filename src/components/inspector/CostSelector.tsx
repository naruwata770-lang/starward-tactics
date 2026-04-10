/**
 * CostSelector: 1.5 / 2 / 2.5 / 3 のうち 1 つを選ぶ。
 *
 * 値はラジオ的なボタングループとして表現する (`role="radiogroup"`)。
 * 選択中ボタンは背景色を反転して強調。
 */

import { COSTS } from '../../constants/game'
import { useBoardDispatch } from '../../state/BoardContext'
import type { Cost, UnitId } from '../../types/board'

export interface CostSelectorProps {
  unitId: UnitId
  current: Cost
}

export function CostSelector({ unitId, current }: CostSelectorProps) {
  const dispatch = useBoardDispatch()

  return (
    <div role="radiogroup" aria-label="コスト" className="flex gap-2">
      {COSTS.map((cost) => {
        const isSelected = current === cost
        return (
          <button
            key={cost}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => dispatch({ type: 'SET_COST', unitId, cost })}
            className={`flex-1 rounded-md px-2 py-2 text-sm font-bold transition ${
              isSelected
                ? 'bg-slate-200 text-slate-900'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {cost}
          </button>
        )
      })}
    </div>
  )
}
