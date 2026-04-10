/**
 * UnitToken: 1 機分のユニット表示（円 + ピル型ラベル）。
 *
 * Phase 3 では静的描画のみ。ドラッグや選択ハイライトは Phase 4 以降。
 *
 * 重要: SVG 内の色は fill/stroke 属性で指定する（Tailwind class 禁止）。
 * Phase 9 の PNG 出力で XMLSerializer → Canvas 変換時に外部 CSS が解決されないため。
 */

import { UNIT_COLORS, UNIT_LABELS } from '../../constants/game'
import type { Unit } from '../../types/board'

const RADIUS = 30

// 名前ラベル（ピル）の寸法
const LABEL_WIDTH = 56
const LABEL_HEIGHT = 18
const LABEL_OFFSET_Y = RADIUS + 6 // 円の下に少し離して配置
const LABEL_RADIUS = LABEL_HEIGHT / 2

export interface UnitTokenProps {
  unit: Unit
}

export function UnitToken({ unit }: UnitTokenProps) {
  const color = UNIT_COLORS[unit.id]
  const label = UNIT_LABELS[unit.id]

  return (
    <g>
      {/* 本体: 円 */}
      <circle
        cx={unit.x}
        cy={unit.y}
        r={RADIUS}
        fill={color}
        stroke="#0f172a"
        strokeWidth={2}
      />

      {/* 名前ラベル: ピル型の背景 + テキスト */}
      <rect
        x={unit.x - LABEL_WIDTH / 2}
        y={unit.y + LABEL_OFFSET_Y}
        width={LABEL_WIDTH}
        height={LABEL_HEIGHT}
        rx={LABEL_RADIUS}
        ry={LABEL_RADIUS}
        fill="#0f172a"
        stroke={color}
        strokeWidth={1}
      />
      <text
        x={unit.x}
        y={unit.y + LABEL_OFFSET_Y + LABEL_HEIGHT / 2}
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
