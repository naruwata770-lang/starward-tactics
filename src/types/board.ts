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
  /**
   * 機体識別子 (`src/data/characters.ts` の `Character.id`)。
   * `null` のときは「未選択」状態 (cost を手動で編集できる従来の挙動)。
   * Issue #55 (URL v2) で導入。
   */
  characterId: string | null
  /**
   * 残 HP の絶対値。
   * - `null` = 「機体未選択 / HP 表示不能」(characterId === null と整合)
   * - `0` = 撃破済み (token を半透明 + HP バー empty で表示)
   * - `0..maxHp` = 現在残量
   *
   * Issue #58 で導入。`null` と `0` は意味が **完全に異なる** ため、
   * truthy 判定 (`if (hp)` など) は禁止 (Codex/Gemini[共通・高] 反映)。
   * 比較は必ず `=== null` / `=== 0` / `> 0` で書く。
   */
  hp: number | null
  /**
   * 残ブースト (%)。常に整数 0..100。デフォルト 100。
   * Issue #58 で導入。characterId に依存せず常に保持する (boost は機体不問)。
   */
  boost: number
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
  | { type: 'SET_CHARACTER'; unitId: UnitId; characterId: string | null }
  /**
   * Issue #58: HP / Boost を編集する。Action を 2 つに分けることで Undo 1 単位を
   * 「HP 操作」「Boost 操作」で独立させる (Codex 提案[共通・中] 反映)。
   *
   * - `SET_HP` の hp は `null` または 0..maxHp の整数。reducer 側で clamp + 整数化する。
   *   characterId === null のときは hp = null 固定 (reducer で防御)
   * - `SET_BOOST` の boost は 0..100 の整数。reducer 側で clamp + 整数化する。
   */
  | { type: 'SET_HP'; unitId: UnitId; hp: number | null }
  | { type: 'SET_BOOST'; unitId: UnitId; boost: number }
  | { type: 'LOAD_STATE'; state: BoardState }
  | { type: 'RESET' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
