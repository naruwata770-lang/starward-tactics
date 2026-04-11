/**
 * 方向 (度数) と SVG 座標系を橋渡しする幾何ユーティリティ。
 *
 * Phase 7 (Issue #8) で UnitToken と DirectionPicker の両方で必要になり、
 * 同じ計算式が分散していると `UnitToken.test.tsx` の幾何不変条件テストが
 * 当てにならなくなるリスクがあるため共通化した (3 者レビューの [共通] 中
 * 指摘 + Gemini の補強根拠を反映)。
 *
 * 約束:
 * - 0° = 上、時計回りに増える (90° = 右、180° = 下、270° = 左)
 * - SVG の y 軸は下向きなので、dy は cos の符号を反転する
 * - 戻り値は単位ベクトル: `(0, -1)` が上向き、`(1, 0)` が右向き
 *
 * 「描画寸法」(constants/board.ts) と「ゲーム概念」(constants/game.ts) どちら
 * にも属さない pure ロジックなので、コンポーネント領域に近い場所
 * (`src/components/board/`) に置く。React に依存せず TypeScript だけで完結。
 */

import type { Direction } from '../../types/board'

export function directionToVector(
  direction: Direction,
): { dx: number; dy: number } {
  const rad = (direction * Math.PI) / 180
  return { dx: Math.sin(rad), dy: -Math.cos(rad) }
}
