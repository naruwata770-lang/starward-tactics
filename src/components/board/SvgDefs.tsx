/**
 * SVG <defs>: 盤面で使い回す pattern / marker などを定義する。
 *
 * 現状は GRID_SIZE のグリッド pattern のみ。Phase 5 以降でロックオンの矢印
 * marker を追加予定。
 *
 * 注意: ここで定義する色は SVG 属性ベース (fill/stroke)。Tailwind class は
 * 使わない (Phase 9 の PNG 出力で外部 CSS が解決されないため)。
 */

import { GRID_SIZE } from '../../constants/board'

export const GRID_PATTERN_ID = 'tacticsboard-grid'

export function SvgDefs() {
  return (
    <defs>
      <pattern
        id={GRID_PATTERN_ID}
        width={GRID_SIZE}
        height={GRID_SIZE}
        patternUnits="userSpaceOnUse"
      >
        <path
          d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
          fill="none"
          stroke="#1e293b"
          strokeWidth={1}
        />
      </pattern>
    </defs>
  )
}
