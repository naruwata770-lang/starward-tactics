/**
 * CoreTypeSelector: コア種別 (F/S/M/D/B/C) を選ぶ。
 *
 * 各ボタンは CORE_TYPES のメタデータの色を背景に使い、コアの色を一目で
 * 認識できるようにする。
 */

import { CORE_TYPES } from '../../constants/game'
import { useBoardDispatch } from '../../state/BoardContext'
import type { CoreType, UnitId } from '../../types/board'

export interface CoreTypeSelectorProps {
  unitId: UnitId
  current: CoreType
}

export function CoreTypeSelector({ unitId, current }: CoreTypeSelectorProps) {
  const dispatch = useBoardDispatch()

  return (
    <div
      role="radiogroup"
      aria-label="コア種別"
      className="grid grid-cols-3 gap-2"
    >
      {CORE_TYPES.map(({ id, label, color }) => {
        const isSelected = current === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() =>
              dispatch({ type: 'SET_CORE_TYPE', unitId, coreType: id })
            }
            title={label}
            className={`rounded-md px-2 py-2 text-sm font-bold text-slate-900 transition ${
              isSelected
                ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{ backgroundColor: color }}
          >
            {id}
          </button>
        )
      })}
    </div>
  )
}
