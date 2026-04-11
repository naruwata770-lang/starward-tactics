/**
 * UnitToken: 1 機分のユニット表示。
 *
 * 構成 (上から下):
 * - 円本体 (色つき)
 *   - コスト数値: 円中央、太字白。「最も大事な数字を中央に大きく」(参考元 kuro7983 と同方針)
 *   - SB ゲージ: 円下部内側に 2 セグメントの小バー (none/half/full)
 * - 名前ピル: 円の下に配置
 *   - 「{ユニット名} {コア略称}」を表示。コア略称は CORE_TYPES の色で着色 (一目で識別)
 *
 * Phase 6 (Issue #7) で追加した責務:
 * - useDrag の Pointer ハンドラを最外 <g> に貼ってドラッグ対応
 * - touchAction: 'none' でブラウザのスクロール / ピンチ介入を抑止
 *   (style 属性で書く理由: Phase 9 の PNG 出力で外部 CSS が解決されないため。
 *    `<g>` に置けば touch-action は祖先方向に解決されるので、ユニットの
 *    interactive 領域だけスクロール抑止が効き、盤面外のページスクロールは生きる)
 * - React.memo でラップ: ドラッグ中は MOVE_UNIT で BoardPresentContext が
 *   毎フレーム更新され Board が再 render されるが、updateUnit (boardReducer) は
 *   変更ユニットだけ新オブジェクトを作るので、他ユニットの memo は参照同一で
 *   即スキップされる
 *
 * Phase 7 (Issue #8) で追加した責務:
 * - `unit.direction` を反映した方向矢印 (line + 三角 polygon)
 *   - 0° = 上、時計回り 45° 刻み (8 方向)
 *   - 寸法は constants/board.ts の UNIT_DIRECTION_* に集約
 *   - 矢印は円本体の bounding box 内に収まる幾何不変条件を満たす
 *     (constants/board.ts の UNIT_DIRECTION_LINE_OUTER のコメント参照)
 *   - pointerEvents="none" を矢印 <g> に付与し、矢印越しのドラッグ判定が
 *     最外 <g> の onPointerDown に届くようにしている
 *
 * Phase 8 以降の予定:
 * - ロックオン線 (Phase 8)
 *
 * 重要: SVG 内の色は fill/stroke 属性で指定する (Tailwind class 禁止)。
 * Phase 9 の PNG 出力で XMLSerializer → Canvas 変換時に外部 CSS が解決されないため。
 *
 * 描画寸法 (UNIT_RADIUS / UNIT_LABEL_* / UNIT_SB_* / UNIT_COST_FONT_SIZE) は
 * すべて constants/board.ts に集約しており、boardReducer の座標クランプも
 * 同じ定数を参照して安全範囲を導出している。
 */

import { memo } from 'react'

import {
  UNIT_COST_FONT_SIZE,
  UNIT_COST_TEXT_COLOR,
  UNIT_COST_Y_NUDGE,
  UNIT_DIRECTION_ARROW_HALF_WIDTH,
  UNIT_DIRECTION_ARROW_HEAD_LENGTH,
  UNIT_DIRECTION_COLOR,
  UNIT_DIRECTION_LINE_INNER,
  UNIT_DIRECTION_LINE_OUTER,
  UNIT_DIRECTION_LINE_WIDTH,
  UNIT_LABEL_BG_COLOR,
  UNIT_LABEL_FONT_SIZE,
  UNIT_LABEL_GAP,
  UNIT_LABEL_HEIGHT,
  UNIT_LABEL_STROKE_WIDTH,
  UNIT_LABEL_TEXT_COLOR,
  UNIT_LABEL_WIDTH,
  UNIT_RADIUS,
  UNIT_SB_BAR_EMPTY_COLOR,
  UNIT_SB_BAR_FILLED_COLOR,
  UNIT_SB_BAR_GAP,
  UNIT_SB_BAR_HEIGHT,
  UNIT_SB_BAR_WIDTH,
  UNIT_SB_Y_OFFSET,
  UNIT_STROKE_COLOR,
  UNIT_STROKE_WIDTH,
} from '../../constants/board'
import {
  CORE_TYPE_BY_ID,
  UNIT_COLORS,
  UNIT_LABELS,
} from '../../constants/game'
import { useDrag } from '../../hooks/useDrag'
import type { StarburstLevel, Unit } from '../../types/board'
import { directionToVector } from './directionGeometry'

// 円中心からラベル上端までの距離。constants の UNIT_RADIUS と UNIT_LABEL_GAP の和。
const LABEL_OFFSET_Y = UNIT_RADIUS + UNIT_LABEL_GAP
// ピル型の角丸半径 (高さの半分)
const LABEL_CORNER_RADIUS = UNIT_LABEL_HEIGHT / 2

/**
 * StarburstLevel から「点灯セグメント数 (0..2)」を返す。
 * none → 0 / half → 1 / full → 2
 */
function sbFillCount(level: StarburstLevel): number {
  switch (level) {
    case 'none':
      return 0
    case 'half':
      return 1
    case 'full':
      return 2
  }
}

export interface UnitTokenProps {
  unit: Unit
}

export const UnitToken = memo(function UnitToken({ unit }: UnitTokenProps) {
  const color = UNIT_COLORS[unit.id]
  const label = UNIT_LABELS[unit.id]
  // CORE_TYPE_BY_ID は constants/game.ts で satisfies により全キー網羅が型で保証されている
  const coreColor = CORE_TYPE_BY_ID[unit.coreType].color
  const sbCount = sbFillCount(unit.starburst)
  // useDrag に unit を渡す理由 (PR #25 レビュー指摘 [共通: 高] 反映):
  // useDrag が useBoard() で context を購読すると、`useContext` が `React.memo` を
  // 迂回して全 UnitToken を毎フレーム再 render してしまう。unit を引数で渡すことで
  // context 購読を避け、本体の memo 化が初めて意図通りに効く。
  const dragHandlers = useDrag({ unit })

  // SB ゲージ 2 バーの x 配置 (円中央に対称)
  // 全体幅 = 2 * BAR_WIDTH + GAP, 中央寄せなので left = -(全体幅 / 2)
  const sbTotalWidth = UNIT_SB_BAR_WIDTH * 2 + UNIT_SB_BAR_GAP
  const sbLeftX = unit.x - sbTotalWidth / 2

  // 方向矢印の幾何計算 (Phase 7):
  // - 始点: 円中心から (dx, dy) 方向に UNIT_DIRECTION_LINE_INNER だけ進んだ点
  // - 終点 = 三角形の付け根: 同方向に UNIT_DIRECTION_LINE_OUTER だけ進んだ点
  // - 三角形の先端 (tip): 終点からさらに UNIT_DIRECTION_ARROW_HEAD_LENGTH 進んだ点
  // - 三角形の左右 base: 終点から direction に直交する方向 (-dy, dx) と (dy, -dx)
  //   に UNIT_DIRECTION_ARROW_HALF_WIDTH ずつ進んだ点
  const { dx: dirDx, dy: dirDy } = directionToVector(unit.direction)
  const arrowStartX = unit.x + dirDx * UNIT_DIRECTION_LINE_INNER
  const arrowStartY = unit.y + dirDy * UNIT_DIRECTION_LINE_INNER
  const arrowBaseX = unit.x + dirDx * UNIT_DIRECTION_LINE_OUTER
  const arrowBaseY = unit.y + dirDy * UNIT_DIRECTION_LINE_OUTER
  const arrowTipX =
    unit.x + dirDx * (UNIT_DIRECTION_LINE_OUTER + UNIT_DIRECTION_ARROW_HEAD_LENGTH)
  const arrowTipY =
    unit.y + dirDy * (UNIT_DIRECTION_LINE_OUTER + UNIT_DIRECTION_ARROW_HEAD_LENGTH)
  // direction に直交する単位ベクトル (左 base 用)。SVG y 反転を考慮済み
  const perpDx = -dirDy
  const perpDy = dirDx
  const arrowLeftX = arrowBaseX + perpDx * UNIT_DIRECTION_ARROW_HALF_WIDTH
  const arrowLeftY = arrowBaseY + perpDy * UNIT_DIRECTION_ARROW_HALF_WIDTH
  const arrowRightX = arrowBaseX - perpDx * UNIT_DIRECTION_ARROW_HALF_WIDTH
  const arrowRightY = arrowBaseY - perpDy * UNIT_DIRECTION_ARROW_HALF_WIDTH

  return (
    <g
      onPointerDown={dragHandlers.onPointerDown}
      onPointerMove={dragHandlers.onPointerMove}
      onPointerUp={dragHandlers.onPointerUp}
      onPointerCancel={dragHandlers.onPointerCancel}
      onLostPointerCapture={dragHandlers.onLostPointerCapture}
      style={{ touchAction: 'none', cursor: 'grab' }}
    >
      {/* SVG 単独で開いたときやスクリーンリーダーでユニットを識別できるように */}
      <title>{label}</title>

      {/* 本体: 円 */}
      <circle
        cx={unit.x}
        cy={unit.y}
        r={UNIT_RADIUS}
        fill={color}
        stroke={UNIT_STROKE_COLOR}
        strokeWidth={UNIT_STROKE_WIDTH}
      />

      {/*
        方向矢印 (Phase 7).
        pointerEvents="none" を付ける理由:
        - 矢印 line/polygon が hit-test を奪うと、矢印領域からドラッグを始めた時に
          最外 <g> の onPointerDown が拾えず、ドラッグが効かなくなる
        - 親 <g> の onPointerDown が直接円に届くようにする
      */}
      <g pointerEvents="none" aria-hidden="true">
        <line
          x1={arrowStartX}
          y1={arrowStartY}
          x2={arrowBaseX}
          y2={arrowBaseY}
          stroke={UNIT_DIRECTION_COLOR}
          strokeWidth={UNIT_DIRECTION_LINE_WIDTH}
          strokeLinecap="round"
        />
        <polygon
          points={`${arrowTipX},${arrowTipY} ${arrowLeftX},${arrowLeftY} ${arrowRightX},${arrowRightY}`}
          fill={UNIT_DIRECTION_COLOR}
        />
      </g>

      {/*
        コスト数値: 円中央。font 20 太字白。
        y を少し上にずらしているのは、下に SB ゲージを置くためのスペース確保。
      */}
      <text
        x={unit.x}
        y={unit.y - UNIT_COST_Y_NUDGE}
        fill={UNIT_COST_TEXT_COLOR}
        fontSize={UNIT_COST_FONT_SIZE}
        fontWeight={700}
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {unit.cost}
      </text>

      {/*
        SB ゲージ: 2 セグメント小バー。
        none = 両方 dim, half = 左のみ点灯, full = 両方点灯
      */}
      {[0, 1].map((i) => {
        const filled = i < sbCount
        return (
          <rect
            key={i}
            x={sbLeftX + i * (UNIT_SB_BAR_WIDTH + UNIT_SB_BAR_GAP)}
            y={unit.y + UNIT_SB_Y_OFFSET}
            width={UNIT_SB_BAR_WIDTH}
            height={UNIT_SB_BAR_HEIGHT}
            rx={1}
            ry={1}
            fill={filled ? UNIT_SB_BAR_FILLED_COLOR : UNIT_SB_BAR_EMPTY_COLOR}
          />
        )
      })}

      {/* 名前ラベル: ピル型の背景 */}
      <rect
        x={unit.x - UNIT_LABEL_WIDTH / 2}
        y={unit.y + LABEL_OFFSET_Y}
        width={UNIT_LABEL_WIDTH}
        height={UNIT_LABEL_HEIGHT}
        rx={LABEL_CORNER_RADIUS}
        ry={LABEL_CORNER_RADIUS}
        fill={UNIT_LABEL_BG_COLOR}
        stroke={color}
        strokeWidth={UNIT_LABEL_STROKE_WIDTH}
      />

      {/*
        ピルテキスト: 「{ユニット名} {コア略称}」
        コア略称は CORE_TYPES の色で着色して識別性を上げる。
        textAnchor="middle" によって全体 (tspan 含む) の中心が unit.x に揃う。
      */}
      <text
        x={unit.x}
        y={unit.y + LABEL_OFFSET_Y + UNIT_LABEL_HEIGHT / 2}
        fill={UNIT_LABEL_TEXT_COLOR}
        fontSize={UNIT_LABEL_FONT_SIZE}
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
      >
        <tspan>{label}</tspan>
        <tspan dx={4} fill={coreColor} fontWeight={800}>
          {unit.coreType}
        </tspan>
      </text>
    </g>
  )
})
