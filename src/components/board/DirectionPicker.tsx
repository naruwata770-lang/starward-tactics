/**
 * DirectionPicker: 選択中ユニットの周囲に 8 方向ボタンを並べ、クリック /
 * キーボードで方向を変更する SVG コンポーネント。
 *
 * Phase 7 (Issue #8) で導入。
 *
 * 配置:
 * - Board の <svg> 内、UnitToken 群の **後** に描画される (= 最前面)
 * - 選択ユニット (`useSelection` の selectedUnit) が null のときは何も描かない
 * - 各ボタンは選択ユニット中心から半径 UNIT_DIRECTION_PICKER_RADIUS (= 74)
 *   の円周上、8 方向に均等配置 (0° = 上、時計回り 45° 刻み)
 *
 * Phase 9 PNG 出力契約:
 * - 最外 <g> に `data-no-export="true"` を付与する
 * - Phase 9 の export 処理は SVG ルートを cloneNode してから clone 上で
 *   `querySelectorAll('[data-no-export="true"]').forEach((el) => el.remove())`
 *   を実行することを前提とする
 * - したがってピッカーの **すべての可視要素** (背景円, 小矢印, focus ring,
 *   ヒット領域) はこの最外 <g> の subtree 内に置く必要がある
 *
 * pointer-events 制御:
 * - ピッカー root <g> は `pointerEvents="none"` で hit-test を取らない
 * - 各ボタン <g> だけ `pointerEvents="auto"` で取る
 * - これにより「ボタン同士の隙間 (R=74 の円周上にしかボタンがない)」を掴んで
 *   下のユニットや盤面を操作できる
 *
 * a11y:
 * - 既存セレクタ (StarburstGauge / CostSelector / etc) と完全に揃える
 * - 最外 <g>: `role="group"` + `aria-label="方向ピッカー"`
 * - 各ボタン <g>: `role="button"` + `aria-label="<向き>に変更"` + `aria-pressed`
 * - SVG <g> でも HTML button と等価のキーボード操作を提供:
 *   `tabIndex={0}` + `focusable="true"` (Edge legacy 系の保険) + Enter/Space で
 *   `preventDefault()` してから dispatch
 * - フォーカスリングは `<g>` のブラウザデフォルトに任せず、focus 状態用の
 *   `<circle>` を React state ベースで明示的に描画 (CSS の :focus-visible は
 *   PNG 出力対象外なので使わず、SVG 属性ベースで完結させる)
 *
 * 色は fill / stroke 属性で指定 (Tailwind 禁止) — Phase 9 の PNG 出力対応。
 * 寸法は constants/board.ts の UNIT_DIRECTION_PICKER_* に集約。
 *
 * 実装順 (計画書 §9 / Wire Before Decorate):
 * 1. 最小: 単色円ボタン + onClick → SET_DIRECTION
 * 2. 追従: 選択ユニット位置に追従 + 現在 direction 強調
 * 3. a11y: role / aria-* / tabIndex / Enter,Space
 * 4. 装飾: 半透明背景 / 小矢印 / focus ring
 *
 * このファイルは「全部入り」の最終形だが、レビュー時は上の順で読むと意図が追える。
 */

import { memo, useState, type KeyboardEvent } from 'react'

import {
  UNIT_DIRECTION_PICKER_ARROW_HALF_WIDTH,
  UNIT_DIRECTION_PICKER_ARROW_HEAD_LENGTH,
  UNIT_DIRECTION_PICKER_ARROW_INNER,
  UNIT_DIRECTION_PICKER_ARROW_LINE_WIDTH,
  UNIT_DIRECTION_PICKER_ARROW_OUTER,
  UNIT_DIRECTION_PICKER_BUTTON_FILL,
  UNIT_DIRECTION_PICKER_BUTTON_FILL_OPACITY,
  UNIT_DIRECTION_PICKER_BUTTON_RADIUS,
  UNIT_DIRECTION_PICKER_BUTTON_SELECTED_FILL,
  UNIT_DIRECTION_PICKER_BUTTON_SELECTED_FILL_OPACITY,
  UNIT_DIRECTION_PICKER_BUTTON_SELECTED_STROKE,
  UNIT_DIRECTION_PICKER_BUTTON_STROKE,
  UNIT_DIRECTION_PICKER_BUTTON_STROKE_WIDTH,
  UNIT_DIRECTION_PICKER_FOCUS_RING_RADIUS,
  UNIT_DIRECTION_PICKER_FOCUS_RING_STROKE,
  UNIT_DIRECTION_PICKER_FOCUS_RING_STROKE_WIDTH,
  UNIT_DIRECTION_PICKER_RADIUS,
} from '../../constants/board'
import { DIRECTION_LABELS, DIRECTIONS_8 } from '../../constants/game'
import { useBoard, useBoardDispatch, useSelection } from '../../state/BoardContext'
import type { Direction } from '../../types/board'

/**
 * Direction (度数) を SVG 座標系の単位ベクトル (dx, dy) に変換する。
 *
 * UnitToken と同じ規約: 0° = 上、時計回り、SVG y 反転を考慮して dy = -cos θ。
 * 関数を共通 utility に切り出さない理由: 呼び出しは UnitToken と
 * DirectionPicker の 2 箇所だけで、3 箇所目が現れてから集約する方針 (Codex 低
 * 指摘 + Credo の No Dead Code)。
 */
function directionToVector(direction: Direction): { dx: number; dy: number } {
  const rad = (direction * Math.PI) / 180
  return { dx: Math.sin(rad), dy: -Math.cos(rad) }
}

interface DirectionButtonProps {
  centerX: number
  centerY: number
  direction: Direction
  isSelected: boolean
  isFocused: boolean
  onSelect: (direction: Direction) => void
  onFocus: (direction: Direction) => void
  onBlur: () => void
}

function DirectionButton({
  centerX,
  centerY,
  direction,
  isSelected,
  isFocused,
  onSelect,
  onFocus,
  onBlur,
}: DirectionButtonProps) {
  // 各ボタン内の小矢印を direction の向きに描く (どこを押すとどっちを向くか)
  const { dx, dy } = directionToVector(direction)
  const arrowStartX = centerX + dx * UNIT_DIRECTION_PICKER_ARROW_INNER
  const arrowStartY = centerY + dy * UNIT_DIRECTION_PICKER_ARROW_INNER
  const arrowBaseX = centerX + dx * UNIT_DIRECTION_PICKER_ARROW_OUTER
  const arrowBaseY = centerY + dy * UNIT_DIRECTION_PICKER_ARROW_OUTER
  const arrowTipX =
    centerX +
    dx *
      (UNIT_DIRECTION_PICKER_ARROW_OUTER +
        UNIT_DIRECTION_PICKER_ARROW_HEAD_LENGTH)
  const arrowTipY =
    centerY +
    dy *
      (UNIT_DIRECTION_PICKER_ARROW_OUTER +
        UNIT_DIRECTION_PICKER_ARROW_HEAD_LENGTH)
  const perpDx = -dy
  const perpDy = dx
  const arrowLeftX = arrowBaseX + perpDx * UNIT_DIRECTION_PICKER_ARROW_HALF_WIDTH
  const arrowLeftY = arrowBaseY + perpDy * UNIT_DIRECTION_PICKER_ARROW_HALF_WIDTH
  const arrowRightX = arrowBaseX - perpDx * UNIT_DIRECTION_PICKER_ARROW_HALF_WIDTH
  const arrowRightY = arrowBaseY - perpDy * UNIT_DIRECTION_PICKER_ARROW_HALF_WIDTH

  const fill = isSelected
    ? UNIT_DIRECTION_PICKER_BUTTON_SELECTED_FILL
    : UNIT_DIRECTION_PICKER_BUTTON_FILL
  const fillOpacity = isSelected
    ? UNIT_DIRECTION_PICKER_BUTTON_SELECTED_FILL_OPACITY
    : UNIT_DIRECTION_PICKER_BUTTON_FILL_OPACITY
  const stroke = isSelected
    ? UNIT_DIRECTION_PICKER_BUTTON_SELECTED_STROKE
    : UNIT_DIRECTION_PICKER_BUTTON_STROKE

  const handleKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    // Enter / Space をボタンの確定として扱う。デフォルト動作 (ページスクロール
    // など) を抑止してから dispatch。
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault()
      onSelect(direction)
    }
  }

  return (
    <g
      role="button"
      aria-label={`${DIRECTION_LABELS[direction]}に変更`}
      aria-pressed={isSelected}
      tabIndex={0}
      // 一部ブラウザ (古い Edge / Firefox 系) で SVG <g> の focus 受け取りが
      // 不安定なので明示的に focusable を付ける
      focusable="true"
      pointerEvents="auto"
      style={{ cursor: 'pointer', outline: 'none' }}
      onClick={(e) => {
        // Board の svg ルートに将来 pointer/click ハンドラが付いた時の保険。
        // 現状 useDrag は UnitToken の最外 <g> にしか貼っていないので、
        // ピッカー操作でドラッグが走ることはないが、過剰防御は避けて click と
        // pointerdown だけ止める (pointerup までは止めない)。
        e.stopPropagation()
        onSelect(direction)
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
      }}
      onKeyDown={handleKeyDown}
      onFocus={() => onFocus(direction)}
      onBlur={onBlur}
    >
      {/* 自前 focus ring: <g> のブラウザデフォルト outline に頼らない */}
      {isFocused && (
        <circle
          cx={centerX}
          cy={centerY}
          r={UNIT_DIRECTION_PICKER_FOCUS_RING_RADIUS}
          fill="none"
          stroke={UNIT_DIRECTION_PICKER_FOCUS_RING_STROKE}
          strokeWidth={UNIT_DIRECTION_PICKER_FOCUS_RING_STROKE_WIDTH}
          aria-hidden="true"
        />
      )}
      {/* 背景円 (ヒット領域も兼ねる) */}
      <circle
        cx={centerX}
        cy={centerY}
        r={UNIT_DIRECTION_PICKER_BUTTON_RADIUS}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={UNIT_DIRECTION_PICKER_BUTTON_STROKE_WIDTH}
      />
      {/* 中央から外向きの小矢印: どの方向に変えるかを視覚的に示す */}
      <line
        x1={arrowStartX}
        y1={arrowStartY}
        x2={arrowBaseX}
        y2={arrowBaseY}
        stroke={UNIT_DIRECTION_PICKER_BUTTON_SELECTED_STROKE}
        strokeWidth={UNIT_DIRECTION_PICKER_ARROW_LINE_WIDTH}
        strokeLinecap="round"
        pointerEvents="none"
      />
      <polygon
        points={`${arrowTipX},${arrowTipY} ${arrowLeftX},${arrowLeftY} ${arrowRightX},${arrowRightY}`}
        fill={UNIT_DIRECTION_PICKER_BUTTON_SELECTED_STROKE}
        pointerEvents="none"
      />
      {/* スクリーンリーダー / hover ツールチップ用の冗長ラベル */}
      <title>{DIRECTION_LABELS[direction]}に変更</title>
    </g>
  )
}

/**
 * 8 方向ピッカー本体。
 *
 * memo 化はしない。selection / direction が変わる頻度は低く、内側に React state
 * (focused) を持つので memo の効果が薄い。
 */
export const DirectionPicker = memo(function DirectionPicker() {
  const board = useBoard()
  const { selectedUnit } = useSelection()
  const dispatch = useBoardDispatch()
  // focus ring 表示のための「現在 focus 中のボタン」。null で非表示。
  // useState で持つ理由: SVG <g> の :focus-visible CSS は環境依存、PNG 出力時に
  // 解決されない契約があるので、属性ベースで自前管理する方が予測可能。
  const [focusedDirection, setFocusedDirection] = useState<Direction | null>(null)

  if (selectedUnit === null) return null
  const unit = board.units[selectedUnit]

  return (
    <g
      role="group"
      aria-label="方向ピッカー"
      data-no-export="true"
      // Phase 9 PNG 出力時、cloneNode 後にこの <g> ごと remove される契約。
      // hit-test はピッカーの「ボタンの円の上だけ」で取りたいので、root は
      // pointerEvents="none" にして、各 DirectionButton 内の <g> で auto に戻す。
      pointerEvents="none"
    >
      {DIRECTIONS_8.map((direction) => {
        const { dx, dy } = directionToVector(direction)
        const buttonX = unit.x + dx * UNIT_DIRECTION_PICKER_RADIUS
        const buttonY = unit.y + dy * UNIT_DIRECTION_PICKER_RADIUS
        return (
          <DirectionButton
            key={direction}
            centerX={buttonX}
            centerY={buttonY}
            direction={direction}
            isSelected={unit.direction === direction}
            isFocused={focusedDirection === direction}
            onSelect={(d) =>
              dispatch({ type: 'SET_DIRECTION', unitId: selectedUnit, direction: d })
            }
            onFocus={(d) => setFocusedDirection(d)}
            onBlur={() => setFocusedDirection(null)}
          />
        )
      })}
    </g>
  )
})
