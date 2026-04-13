/**
 * TeamRemainingCostEditor: Inspector 内の「チーム残コスト」セクション。
 *
 * Issue #60 で導入。選択ユニットとは独立してチーム単位の残コスト
 * (味方 / 敵、0..6、0.5 刻み) を ±0.5 ボタンで編集する。
 *
 * MVP では数値直接入力・キーボードショートカット・ドラッグは持たない。
 * 取り得る値が 13 段 (0, 0.5, ..., 6) で quiz 画像生成頻度も高くないため、
 * ボタンで十分という判断 (セカンドオピニオン[共通中] 反映)。
 */

import { memo } from 'react'

import {
  TEAM_REMAINING_COST_MAX,
  TEAM_REMAINING_COST_MIN,
  TEAM_REMAINING_COST_STEP,
  TEAM_SIDE_LABELS,
} from '../../constants/game'
import { useBoard, useBoardDispatch } from '../../state/BoardContext'
import type { TeamSide } from '../../types/board'

interface StepperProps {
  team: TeamSide
  value: number
}

function TeamStepper({ team, value }: StepperProps) {
  const dispatch = useBoardDispatch()
  const canDecrement = value > TEAM_REMAINING_COST_MIN
  const canIncrement = value < TEAM_REMAINING_COST_MAX
  const displayValue = value.toFixed(1)

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-slate-300 w-12">{TEAM_SIDE_LABELS[team]}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`${TEAM_SIDE_LABELS[team]}残コストを ${TEAM_REMAINING_COST_STEP} 減らす`}
          disabled={!canDecrement}
          onClick={() =>
            dispatch({
              type: 'SET_TEAM_REMAINING_COST',
              team,
              value: value - TEAM_REMAINING_COST_STEP,
            })
          }
          className="w-8 h-8 rounded-md bg-slate-800 text-slate-200 font-bold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2"
        >
          −
        </button>
        <span
          className="text-sm font-mono tabular-nums w-14 text-center text-slate-100"
          data-testid={`team-remaining-cost-${team}`}
        >
          {displayValue}/{TEAM_REMAINING_COST_MAX.toFixed(1)}
        </span>
        <button
          type="button"
          aria-label={`${TEAM_SIDE_LABELS[team]}残コストを ${TEAM_REMAINING_COST_STEP} 増やす`}
          disabled={!canIncrement}
          onClick={() =>
            dispatch({
              type: 'SET_TEAM_REMAINING_COST',
              team,
              value: value + TEAM_REMAINING_COST_STEP,
            })
          }
          className="w-8 h-8 rounded-md bg-slate-800 text-slate-200 font-bold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2"
        >
          ＋
        </button>
      </div>
    </div>
  )
}

export const TeamRemainingCostEditor = memo(function TeamRemainingCostEditor() {
  const { teamRemainingCost } = useBoard()

  return (
    <div className="space-y-2">
      <TeamStepper team="ally" value={teamRemainingCost.ally} />
      <TeamStepper team="enemy" value={teamRemainingCost.enemy} />
    </div>
  )
})
