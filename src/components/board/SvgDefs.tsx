/**
 * SVG <defs>: 盤面で使い回す pattern / marker などを定義する。
 *
 * グリッド pattern と Phase 8 で追加したロック線の矢印 marker を定義。
 *
 * 注意: ここで定義する色は SVG 属性ベース (fill/stroke)。Tailwind class は
 * 使わない (Phase 9 の PNG 出力で外部 CSS が解決されないため)。
 *
 * memo 化の理由 (Phase 6):
 * Board が毎ドラッグフレームで再 render されるとき、props のない静的コンポーネント
 * を memo で囲んでおけば即スキップされる。UnitToken / GridBackground と方針統一。
 */

import { memo } from 'react'

import {
  GRID_SIZE,
  LOCK_LINE_ALLY_COLOR,
  LOCK_LINE_ARROW_SIZE,
  LOCK_LINE_ENEMY_COLOR,
} from '../../constants/board'

export const GRID_PATTERN_ID = 'tacticsboard-grid'

/**
 * ロック線矢印マーカーの ID。lockLineGeometry / LockLine で参照する。
 * SvgDefs 内の <marker id> と一致させること。
 */
export const LOCK_ARROW_ALLY_ID = 'lock-arrow-ally'
export const LOCK_ARROW_ENEMY_ID = 'lock-arrow-enemy'

export const SvgDefs = memo(function SvgDefs() {
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
      {/*
        Phase 8: ロック線の矢印マーカー。
        markerUnits="userSpaceOnUse" で stroke-width に依存させず、
        viewBox 720×720 の座標系で固定サイズにする。
        refX をマーカー先端 (viewBox の 10) に設定し、矢印チップが
        ちょうどターゲット円表面に来るようにする。
      */}
      <marker
        id={LOCK_ARROW_ALLY_ID}
        viewBox="0 0 10 10"
        refX={10}
        refY={5}
        markerWidth={LOCK_LINE_ARROW_SIZE}
        markerHeight={LOCK_LINE_ARROW_SIZE}
        markerUnits="userSpaceOnUse"
        orient="auto"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill={LOCK_LINE_ALLY_COLOR} />
      </marker>
      <marker
        id={LOCK_ARROW_ENEMY_ID}
        viewBox="0 0 10 10"
        refX={10}
        refY={5}
        markerWidth={LOCK_LINE_ARROW_SIZE}
        markerHeight={LOCK_LINE_ARROW_SIZE}
        markerUnits="userSpaceOnUse"
        orient="auto"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill={LOCK_LINE_ENEMY_COLOR} />
      </marker>
    </defs>
  )
})
