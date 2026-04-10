/**
 * GridBackground: 盤面の背景レイヤー。
 *
 * ダーク背景 + GRID_SIZE のグリッド pattern を VIEW_BOX_SIZE 全面に敷く。
 * 色は属性ベース (PNG 出力時に CSS が無効になっても色が出るように)。
 */

import { VIEW_BOX_SIZE } from '../../constants/board'
import { GRID_PATTERN_ID } from './SvgDefs'

export function GridBackground() {
  return (
    <>
      <rect x={0} y={0} width={VIEW_BOX_SIZE} height={VIEW_BOX_SIZE} fill="#0f172a" />
      <rect
        x={0}
        y={0}
        width={VIEW_BOX_SIZE}
        height={VIEW_BOX_SIZE}
        fill={`url(#${GRID_PATTERN_ID})`}
      />
    </>
  )
}
