/**
 * ロック線の幾何計算 (Phase 8)。
 *
 * directionGeometry.ts と同じパターンで、描画に必要な座標・属性を
 * 純粋関数から返す。コンポーネントから切り離すことでテストしやすくする。
 *
 * 色はソースの陣営を示す (ターゲットとの関係ではない):
 * - 味方側 (self/ally) → 青 (LOCK_LINE_ALLY_COLOR)
 * - 敵側 (enemy1/enemy2) → 赤 (LOCK_LINE_ENEMY_COLOR)
 */

import {
  LOCK_LINE_ALLY_COLOR,
  LOCK_LINE_ENEMY_COLOR,
  LOCK_LINE_MIN_SHAFT_LENGTH,
  UNIT_RADIUS,
} from '../../constants/board'
import { getUnitSide } from '../../constants/game'
import type { Unit } from '../../types/board'
import { LOCK_ARROW_ALLY_ID, LOCK_ARROW_ENEMY_ID } from './SvgDefs'

export interface LockLineGeometry {
  /** 始点 x (ソース円表面) */
  x1: number
  /** 始点 y (ソース円表面) */
  y1: number
  /** 終点 x (ターゲット円表面) */
  x2: number
  /** 終点 y (ターゲット円表面) */
  y2: number
  /** SVG marker id (url(#...) 形式ではなく ID のみ) */
  markerId: string
  /** ロック線の色 */
  color: string
}

/**
 * ソースとターゲットの座標からロック線の描画パラメータを計算する。
 *
 * ユニット同士が近すぎて線の胴体が MIN_SHAFT_LENGTH 未満になる場合は
 * null を返す (破線パターンやマーカーの向きが不安定になるため)。
 */
export function getLockLineGeometry(
  source: Unit,
  target: Unit,
): LockLineGeometry | null {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  // 距離が足りない: 円同士の隙間が MIN_SHAFT_LENGTH 以下
  if (distance <= UNIT_RADIUS * 2 + LOCK_LINE_MIN_SHAFT_LENGTH) {
    return null
  }

  // 正規化した方向ベクトル
  const ux = dx / distance
  const uy = dy / distance

  const side = getUnitSide(source.id)

  return {
    x1: source.x + ux * UNIT_RADIUS,
    y1: source.y + uy * UNIT_RADIUS,
    x2: target.x - ux * UNIT_RADIUS,
    y2: target.y - uy * UNIT_RADIUS,
    markerId: side === 'ally' ? LOCK_ARROW_ALLY_ID : LOCK_ARROW_ENEMY_ID,
    color: side === 'ally' ? LOCK_LINE_ALLY_COLOR : LOCK_LINE_ENEMY_COLOR,
  }
}
