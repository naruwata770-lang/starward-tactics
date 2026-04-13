/**
 * BoostEditor: 選択ユニットの Boost (覚醒ゲージ) を編集する (Issue #58)。
 *
 * - 値域は 0..100 (機体不問)。reducer 側でも clamp + 整数化される
 * - characterId に依らず常に操作可能 (Boost は機体不問)
 * - HpEditor とほぼ対称の構成 (slider + number + reset)
 *
 * StarburstGauge (覚醒の段階: なし/半覚/全覚) とは別物。Boost は数値ゲージ
 * (例: バーストゲージの残量) を表現する。
 */

import { memo, useCallback } from 'react'

import { BOOST_MAX } from '../../constants/game'
import { useBoardDispatch } from '../../state/BoardContext'
import type { UnitId } from '../../types/board'

export interface BoostEditorProps {
  unitId: UnitId
  boost: number
}

export const BoostEditor = memo(function BoostEditor({
  unitId,
  boost,
}: BoostEditorProps) {
  const dispatch = useBoardDispatch()

  const setBoost = useCallback(
    (value: number) => {
      dispatch({ type: 'SET_BOOST', unitId, boost: value })
    },
    [dispatch, unitId],
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={BOOST_MAX}
          step={1}
          value={boost}
          onChange={(e) => setBoost(Number(e.target.value))}
          aria-label="Boost スライダー"
          aria-valuenow={boost}
          aria-valuemin={0}
          aria-valuemax={BOOST_MAX}
          className="flex-1 cursor-pointer accent-sky-500"
        />
        <input
          type="number"
          min={0}
          max={BOOST_MAX}
          step={1}
          value={boost}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (!Number.isFinite(v)) return
            setBoost(v)
          }}
          aria-label="Boost 数値入力"
          className="w-20 rounded-md bg-slate-800 px-2 py-1 text-right text-sm tabular-nums text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2"
        />
        <span className="text-xs tabular-nums text-slate-500">%</span>
      </div>
      <button
        type="button"
        onClick={() => setBoost(BOOST_MAX)}
        disabled={boost === BOOST_MAX}
        className="cursor-pointer rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800"
      >
        Boost 最大に戻す
      </button>
    </div>
  )
})
