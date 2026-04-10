/**
 * UnitToken: 1 機分のユニット表示 (円 + ピル型ラベル)。
 *
 * Phase 3 では静的描画のみ。ドラッグや選択ハイライトは Phase 4 以降。
 *
 * Phase 4 以降の予定:
 * - `unit.direction` を反映した方向インジケータ (三角または短い線) の追加
 * - 選択中のハイライト
 * - ドラッグハンドル
 *
 * 重要: SVG 内の色は fill/stroke 属性で指定する (Tailwind class 禁止)。
 * Phase 9 の PNG 出力で XMLSerializer → Canvas 変換時に外部 CSS が解決されないため。
 *
 * 描画寸法 (UNIT_RADIUS / UNIT_LABEL_*) は constants/board.ts に集約しており、
 * boardReducer の座標クランプも同じ定数を参照して安全範囲を導出している。
 */

import {
  UNIT_LABEL_GAP,
  UNIT_LABEL_HEIGHT,
  UNIT_LABEL_WIDTH,
  UNIT_RADIUS,
  UNIT_STROKE_WIDTH,
} from '../../constants/board'
import { UNIT_COLORS, UNIT_LABELS } from '../../constants/game'
import type { Unit } from '../../types/board'

// 円中心からラベル上端までの距離。constants の UNIT_RADIUS と UNIT_LABEL_GAP の和。
const LABEL_OFFSET_Y = UNIT_RADIUS + UNIT_LABEL_GAP
// ピル型の角丸半径 (高さの半分)
const LABEL_CORNER_RADIUS = UNIT_LABEL_HEIGHT / 2

export interface UnitTokenProps {
  unit: Unit
}

export function UnitToken({ unit }: UnitTokenProps) {
  const color = UNIT_COLORS[unit.id]
  const label = UNIT_LABELS[unit.id]

  return (
    <g>
      {/* SVG 単独で開いたときやスクリーンリーダーでユニットを識別できるように */}
      <title>{label}</title>

      {/* 本体: 円 */}
      <circle
        cx={unit.x}
        cy={unit.y}
        r={UNIT_RADIUS}
        fill={color}
        stroke="#0f172a"
        strokeWidth={UNIT_STROKE_WIDTH}
      />

      {/* 名前ラベル: ピル型の背景 + テキスト */}
      <rect
        x={unit.x - UNIT_LABEL_WIDTH / 2}
        y={unit.y + LABEL_OFFSET_Y}
        width={UNIT_LABEL_WIDTH}
        height={UNIT_LABEL_HEIGHT}
        rx={LABEL_CORNER_RADIUS}
        ry={LABEL_CORNER_RADIUS}
        fill="#0f172a"
        stroke={color}
        strokeWidth={1}
      />
      <text
        x={unit.x}
        y={unit.y + LABEL_OFFSET_Y + UNIT_LABEL_HEIGHT / 2}
        fill="#e2e8f0"
        fontSize={12}
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {label}
      </text>
    </g>
  )
}
