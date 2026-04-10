/**
 * 戦術ボードの型定義。
 *
 * 設計メモ:
 * - selectedUnit は BoardState に入れない（URL 共有に含めたくない UI 状態のため UIContext で管理）
 * - 座標 x/y は SVG の 720x720 viewBox 上の値（0-720）
 */

export type Direction = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315

export type Cost = 1.5 | 2 | 2.5 | 3

export type StarburstLevel = 'none' | 'half' | 'full'

/**
 * コア種類:
 * - F: 格闘 (赤)
 * - S: 射撃 (青)
 * - M: 機動 (黄)
 * - D: 防御 (緑)
 * - B: バランス (白)
 * - C: カバーリング (紫)
 */
export type CoreType = 'F' | 'S' | 'M' | 'D' | 'B' | 'C'

export type UnitId = 'self' | 'ally' | 'enemy1' | 'enemy2'

export interface Unit {
  id: UnitId
  x: number
  y: number
  direction: Direction
  cost: Cost
  starburst: StarburstLevel
  coreType: CoreType
  lockTarget: UnitId | null
}

export interface BoardState {
  units: Record<UnitId, Unit>
}

/**
 * BoardAction
 *
 * MOVE_UNIT と COMMIT_MOVE を分けている理由:
 * ドラッグ中は MOVE_UNIT で連続発火するが、これらを履歴に積むと
 * Undo 1 回でピクセル単位しか戻らない。COMMIT_MOVE をドラッグ終了時のみ
 * dispatch することで「1 ドラッグ = 1 履歴」になる。
 */
export type BoardAction =
  | { type: 'MOVE_UNIT'; unitId: UnitId; x: number; y: number }
  | { type: 'COMMIT_MOVE'; unitId: UnitId; x: number; y: number }
  | { type: 'SET_DIRECTION'; unitId: UnitId; direction: Direction }
  | { type: 'SET_COST'; unitId: UnitId; cost: Cost }
  | { type: 'SET_STARBURST'; unitId: UnitId; level: StarburstLevel }
  | { type: 'SET_CORE_TYPE'; unitId: UnitId; coreType: CoreType }
  | { type: 'SET_LOCK_TARGET'; unitId: UnitId; target: UnitId | null }
  | { type: 'LOAD_STATE'; state: BoardState }
  | { type: 'RESET' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
