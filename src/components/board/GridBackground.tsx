/**
 * GridBackground: 盤面の背景レイヤー。
 *
 * ダーク背景 + GRID_SIZE のグリッド pattern を VIEW_BOX_SIZE 全面に敷く。
 * 色は属性ベース (PNG 出力時に CSS が無効になっても色が出るように)。
 *
 * memo 化の理由 (Phase 6):
 * ドラッグ中は MOVE_UNIT で BoardPresentContext が毎フレーム更新され、
 * Board 全体が再 render される。このコンポーネントは props を取らない完全な
 * 静的レイヤーなので、memo で囲めば props 同一 (= props なし) で必ず即スキップされる。
 * UnitToken の memo 化と合わせて、ドラッグ中の reconciliation コストを最小化する。
 */

import { memo } from 'react'

import { VIEW_BOX_SIZE } from '../../constants/board'
import { GRID_PATTERN_ID } from './SvgDefs'

export const GridBackground = memo(function GridBackground() {
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
})
