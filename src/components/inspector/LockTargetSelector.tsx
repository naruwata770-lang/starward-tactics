/**
 * LockTargetSelector: 編集中ユニットのロック対象を選ぶ。
 *
 * 「なし」 + 自分以外の 3 機。reducer 側で「自分自身ロック禁止」を
 * 弾いているので、UI 側でも自分は最初から選択肢に含めない。
 *
 * Phase 4 では state を持つだけ。Phase 8 (ロック線) で実際の線が引かれる。
 */

import { UNIT_COLORS, UNIT_IDS, UNIT_LABELS } from '../../constants/game'
import { useBoardDispatch } from '../../state/BoardContext'
import type { UnitId } from '../../types/board'

export interface LockTargetSelectorProps {
  unitId: UnitId
  current: UnitId | null
}

export function LockTargetSelector({
  unitId,
  current,
}: LockTargetSelectorProps) {
  const dispatch = useBoardDispatch()

  // 自分以外の 3 機を選択肢に
  const candidates = UNIT_IDS.filter((id) => id !== unitId)

  return (
    <div role="radiogroup" aria-label="ロック対象" className="flex gap-2">
      <button
        key="none"
        type="button"
        role="radio"
        aria-checked={current === null}
        onClick={() =>
          dispatch({ type: 'SET_LOCK_TARGET', unitId, target: null })
        }
        className={`flex-1 rounded-md px-2 py-2 text-xs font-bold transition ${
          current === null
            ? 'bg-slate-200 text-slate-900'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`}
      >
        なし
      </button>
      {candidates.map((id) => {
        const isSelected = current === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() =>
              dispatch({ type: 'SET_LOCK_TARGET', unitId, target: id })
            }
            className={`flex-1 rounded-md px-2 py-2 text-xs font-bold text-slate-900 transition ${
              isSelected
                ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{ backgroundColor: UNIT_COLORS[id] }}
          >
            {UNIT_LABELS[id]}
          </button>
        )
      })}
    </div>
  )
}
