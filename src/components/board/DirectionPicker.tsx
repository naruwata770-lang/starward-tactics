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
 *   `tabIndex={0}` + `onKeyDown` で Enter/Space を `preventDefault()` してから
 *   dispatch する。モダンブラウザでは `<g tabIndex={0}>` がフォーカスを受ける
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

import { useState, type KeyboardEvent } from 'react'

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
import { directionToVector } from './directionGeometry'

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
    // など) を抑止してから dispatch する。stopPropagation も併用しているのは、
    // 将来 Board ルートに矢印キー等のショートカットを足したときに、ピッカー
    // 操作の Enter/Space が親に伝わって誤動作するのを防ぐ保険 (Gemini 中指摘)。
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault()
      e.stopPropagation()
      onSelect(direction)
    }
  }

  return (
    <g
      role="button"
      aria-label={`${DIRECTION_LABELS[direction]}に変更`}
      aria-pressed={isSelected}
      tabIndex={0}
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
      {/*
        <title> を <g> 直下の先頭に置く (SVG 慣例).
        多くのブラウザは要素の先頭の <title> をネイティブツールチップとして
        優先的に拾う。
      */}
      <title>{DIRECTION_LABELS[direction]}に変更</title>
      {/*
        自前 focus ring: <g> のブラウザデフォルト outline に頼らない。
        focus 中だけ表示。pointer-events="none" を付けて、リングの stroke 幅
        ぶんだけヒット領域が広がってしまうのを防ぐ (Codex 低指摘)。
      */}
      {isFocused && (
        <circle
          cx={centerX}
          cy={centerY}
          r={UNIT_DIRECTION_PICKER_FOCUS_RING_RADIUS}
          fill="none"
          stroke={UNIT_DIRECTION_PICKER_FOCUS_RING_STROKE}
          strokeWidth={UNIT_DIRECTION_PICKER_FOCUS_RING_STROKE_WIDTH}
          pointerEvents="none"
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
    </g>
  )
}

/**
 * 8 方向ピッカー本体。
 *
 * memo 化していない理由:
 * - props を持たない (親 Board は <DirectionPicker /> としか書けない) ので
 *   memo の参照同一性 bailout が効かない
 * - 内部で useBoard / useSelection / 自前 useState を購読するため、render を
 *   抑えるには props 経由の最適化ではなく context の subscription 設計が必要
 *   (= memo 単独では効果が薄い)
 * - ピッカーの再 render コストは 8 ボタン分の SVG 出力だけで現状軽量
 *
 * 将来「ドラッグ中に毎フレーム再 render される」コストが顕在化したら、
 * useDrag のように context 購読を消して props 経由に切り替える設計を検討する
 * (Phase 6 / PR #25 と同じ手法)。
 */
export function DirectionPicker() {
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
}
