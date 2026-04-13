/**
 * TeamCostBar: 味方 / 敵のチーム残コスト (0..6, 0.5 刻み) をバーで表示する。
 *
 * Issue #60 で導入。quiz 画像共有用途で、EXVS2 系の「最大コスト 6 からの撃墜消費」
 * を戦況情報として残すため。
 *
 * 配置:
 * - 盤面 SVG の外側 (Toolbar 直下) に独立した SVG として描画する
 * - PNG 出力は `exportPng.ts` が盤面 SVG と合成する (canvas 合成案)。本コンポーネントに
 *   `id={TEAM_COST_BAR_SVG_ID}` を付けて querySelectable にしておく
 *
 * 色指定は全て属性ベース (Tailwind 禁止)。PNG 出力で外部 CSS が解決されない制約に
 * 合わせるため、他 board コンポーネントと同じ方針で `constants/game.ts` の
 * カラーコード定数を直接 fill 属性に埋める。
 */

import { memo } from 'react'

import {
  TEAM_COST_BAR_SVG_ID,
  TEAM_COST_BAR_VIEW_BOX_HEIGHT,
  TEAM_COST_BAR_VIEW_BOX_WIDTH,
} from '../../constants/board'
import { TEAM_REMAINING_COST_MAX } from '../../constants/game'
import { useBoard } from '../../state/BoardContext'
import type { TeamSide } from '../../types/board'

/**
 * 1 チーム分のバー描画に使う色セット。
 * ally は board の self/ally と揃えて青系、enemy は赤系。
 */
const BAR_COLORS: Record<TeamSide, { fill: string; track: string; label: string }> = {
  ally: { fill: '#38bdf8', track: '#1e293b', label: '#e2e8f0' },
  enemy: { fill: '#ef4444', track: '#1e293b', label: '#e2e8f0' },
}

const TEAM_LABELS: Record<TeamSide, string> = {
  ally: '味方',
  enemy: '敵',
}

/** 1 列あたりの x 座標設計: label → track/fill → value の横並び。 */
const COLUMN_WIDTH = TEAM_COST_BAR_VIEW_BOX_WIDTH / 2
const ROW_Y = TEAM_COST_BAR_VIEW_BOX_HEIGHT / 2
const BAR_HEIGHT = 24
const BAR_Y = ROW_Y - BAR_HEIGHT / 2
const LABEL_X_OFFSET = 20
const BAR_X_OFFSET = 70
const BAR_WIDTH = 200
const VALUE_X_OFFSET = BAR_X_OFFSET + BAR_WIDTH + 12

interface TeamRowProps {
  side: TeamSide
  value: number
  columnX: number
}

function TeamRow({ side, value, columnX }: TeamRowProps) {
  const colors = BAR_COLORS[side]
  const clampedRatio = Math.max(
    0,
    Math.min(1, value / TEAM_REMAINING_COST_MAX),
  )
  const filledWidth = BAR_WIDTH * clampedRatio
  // 残コストは 0.5 刻み。toString だと 6, 5.5, 5 のように可変桁になるので
  // 見た目の揺れを抑えるため toFixed(1) で固定小数 (例: "6.0")。
  const valueLabel = `${value.toFixed(1)}/${TEAM_REMAINING_COST_MAX.toFixed(1)}`

  return (
    <g
      aria-label={`${TEAM_LABELS[side]}残コスト ${valueLabel}`}
      role="group"
    >
      <text
        x={columnX + LABEL_X_OFFSET}
        y={ROW_Y}
        dominantBaseline="middle"
        fontSize={16}
        fontWeight={700}
        fill={colors.label}
      >
        {TEAM_LABELS[side]}
      </text>
      <rect
        x={columnX + BAR_X_OFFSET}
        y={BAR_Y}
        width={BAR_WIDTH}
        height={BAR_HEIGHT}
        rx={4}
        ry={4}
        fill={colors.track}
      />
      {filledWidth > 0 && (
        <rect
          x={columnX + BAR_X_OFFSET}
          y={BAR_Y}
          width={filledWidth}
          height={BAR_HEIGHT}
          rx={4}
          ry={4}
          fill={colors.fill}
        />
      )}
      <text
        x={columnX + VALUE_X_OFFSET}
        y={ROW_Y}
        dominantBaseline="middle"
        fontSize={14}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fill={colors.label}
      >
        {valueLabel}
      </text>
    </g>
  )
}

export const TeamCostBar = memo(function TeamCostBar() {
  const { teamRemainingCost } = useBoard()

  return (
    <svg
      id={TEAM_COST_BAR_SVG_ID}
      viewBox={`0 0 ${TEAM_COST_BAR_VIEW_BOX_WIDTH} ${TEAM_COST_BAR_VIEW_BOX_HEIGHT}`}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height={TEAM_COST_BAR_VIEW_BOX_HEIGHT}
      role="img"
      aria-label="チーム残コスト"
      preserveAspectRatio="xMidYMid meet"
    >
      <TeamRow side="ally" value={teamRemainingCost.ally} columnX={0} />
      <TeamRow
        side="enemy"
        value={teamRemainingCost.enemy}
        columnX={COLUMN_WIDTH}
      />
    </svg>
  )
})
