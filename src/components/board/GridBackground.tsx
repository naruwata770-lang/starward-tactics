/**
 * GridBackground: 盤面の背景レイヤー。
 *
 * ダーク背景 + 48px グリッド pattern を 720x720 に敷く。
 * 色は属性ベース（PNG 出力時に CSS が無効になっても色が出るように）。
 */

import { GRID_PATTERN_ID } from './SvgDefs'

export function GridBackground() {
  return (
    <>
      <rect x={0} y={0} width={720} height={720} fill="#0f172a" />
      <rect
        x={0}
        y={0}
        width={720}
        height={720}
        fill={`url(#${GRID_PATTERN_ID})`}
      />
    </>
  )
}
