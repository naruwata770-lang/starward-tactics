/**
 * LockLine: 1 本のロック線を描画する。
 *
 * 破線 + 矢印マーカーでソース→ターゲットのロック関係を表す。
 * 色は SVG 属性で指定 (Phase 9 PNG 出力対応)。
 */

import {
  LOCK_LINE_DASH_ARRAY,
  LOCK_LINE_STROKE_WIDTH,
} from '../../constants/board'
import type { LockLineGeometry } from './lockLineGeometry'

interface LockLineProps {
  geometry: LockLineGeometry
}

export function LockLine({ geometry }: LockLineProps) {
  return (
    <line
      x1={geometry.x1}
      y1={geometry.y1}
      x2={geometry.x2}
      y2={geometry.y2}
      stroke={geometry.color}
      strokeWidth={LOCK_LINE_STROKE_WIDTH}
      strokeDasharray={LOCK_LINE_DASH_ARRAY}
      strokeLinecap="round"
      markerEnd={`url(#${geometry.markerId})`}
    />
  )
}
