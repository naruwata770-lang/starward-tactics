/**
 * CostSelector: 1.5 / 2 / 2.5 / 3 のうち 1 つを選ぶ。
 *
 * ARIA: toggle button group として `aria-pressed` 方式で表現する。
 * `role="radio"` は WAI-ARIA APG が要求する矢印キーナビゲーションや roving
 * tabIndex の実装を伴うため、Phase 4 段階ではフル実装せず、セレクタ間で一貫して
 * `aria-pressed` を使う (UnitSelector 等と揃える)。選択中ボタンは背景色を反転して強調。
 *
 * memo 化: 親 InspectorPanel は board 全体を購読しているため MOVE_UNIT 等で
 * 毎フレーム再 render される。props (unitId / current の数値) のシャロー比較で
 * 変化がなければ bailout する。
 */

import { memo } from 'react'

import { COSTS } from '../../constants/game'
import { useBoardDispatch } from '../../state/BoardContext'
import type { Cost, UnitId } from '../../types/board'

export interface CostSelectorProps {
  unitId: UnitId
  current: Cost
}

export const CostSelector = memo(function CostSelector({
  unitId,
  current,
}: CostSelectorProps) {
  const dispatch = useBoardDispatch()

  return (
    <div role="group" aria-label="コスト" className="flex gap-2">
      {COSTS.map((cost) => {
        const isSelected = current === cost
        return (
          <button
            key={cost}
            type="button"
            aria-pressed={isSelected}
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
})
