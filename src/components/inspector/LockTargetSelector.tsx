/**
 * LockTargetSelector: 編集中ユニットのロック対象を選ぶ。
 *
 * 「なし」 + 自分以外の 3 機。「自分自身ロック禁止」は UI と reducer の
 * 両方で二重に防御している (UI で選択肢から除外 + reducer ガード)。
 *
 * Phase 4 では state を持つだけ。Phase 8 (ロック線) で実際の線が引かれる。
 *
 * ARIA: toggle button group として `aria-pressed` 方式で表現する。他セレクタ
 * (UnitSelector / CostSelector 等) と一貫させるため `role="radio"` は使わない。
 *
 * memo 化: 親 InspectorPanel の再 render に引きずられないよう、props のシャロー比較で bailout する。
 */

import { memo, useMemo } from 'react'

import { UNIT_COLORS, UNIT_IDS, UNIT_LABELS } from '../../constants/game'
import { useBoardDispatch } from '../../state/BoardContext'
import type { UnitId } from '../../types/board'

export interface LockTargetSelectorProps {
  unitId: UnitId
  current: UnitId | null
}

export const LockTargetSelector = memo(function LockTargetSelector({
  unitId,
  current,
}: LockTargetSelectorProps) {
  const dispatch = useBoardDispatch()

  // 自分以外の 3 機を選択肢に。unitId が変わらない限り配列の参照も安定するよう useMemo。
  const candidates = useMemo(
    () => UNIT_IDS.filter((id) => id !== unitId),
    [unitId],
  )

  return (
    <div role="group" aria-label="ロック対象" className="flex gap-2">
      <button
        type="button"
        aria-pressed={current === null}
        onClick={() =>
          dispatch({ type: 'SET_LOCK_TARGET', unitId, target: null })
        }
        className={`flex-1 cursor-pointer rounded-md px-2 py-2 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2 ${
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
            aria-pressed={isSelected}
            onClick={() =>
              dispatch({ type: 'SET_LOCK_TARGET', unitId, target: id })
            }
            // text-black を使う理由: ally (#2563eb) は slate-900 だと AA 4.5:1 を割る。
            // 全ユニットカラーで 4.6+ をクリアするため純粋黒に統一 (UnitSelector と同じ方針)。
            className={`flex-1 cursor-pointer rounded-md px-2 py-2 text-xs font-bold text-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2 ${
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
})
