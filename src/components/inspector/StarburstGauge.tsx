/**
 * StarburstGauge: 覚醒ゲージ (なし / 半覚 / 全覚) を切り替える。
 *
 * UnitToken 側の SB バーと連動する。
 *
 * memo 化: 親 InspectorPanel の再 render に引きずられないよう、props のシャロー比較で bailout する。
 */

import { memo } from 'react'

import { STARBURST_LABELS, STARBURST_LEVELS } from '../../constants/game'
import { useBoardDispatch } from '../../state/BoardContext'
import type { StarburstLevel, UnitId } from '../../types/board'

export interface StarburstGaugeProps {
  unitId: UnitId
  current: StarburstLevel
}

export const StarburstGauge = memo(function StarburstGauge({
  unitId,
  current,
}: StarburstGaugeProps) {
  const dispatch = useBoardDispatch()

  return (
    <div role="radiogroup" aria-label="覚醒ゲージ" className="flex gap-2">
      {STARBURST_LEVELS.map((level) => {
        const isSelected = current === level
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() =>
              dispatch({ type: 'SET_STARBURST', unitId, level })
            }
            className={`flex-1 rounded-md px-2 py-2 text-sm font-bold transition ${
              isSelected
                ? 'bg-amber-400 text-slate-900'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {STARBURST_LABELS[level]}
          </button>
        )
      })}
    </div>
  )
})
