/**
 * 星の翼の戦術ボードで使うゲーム固有の定数。
 *
 * 色は SVG の fill/stroke 属性で直接使うため、Tailwind class ではなく
 * カラーコード文字列で持つ（PNG 出力時に外部 CSS が解決されない問題を回避）。
 */

import type {
  BoardState,
  CoreType,
  Cost,
  Direction,
  StarburstLevel,
  Unit,
  UnitId,
} from '../types/board'

export const UNIT_IDS: readonly UnitId[] = ['self', 'ally', 'enemy1', 'enemy2']

/**
 * ユニットの陣営。ロック線の色分け・マーカー選択で使用 (Phase 8)。
 *
 * 'ally' = 味方側 (self / ally)、'enemy' = 敵側 (enemy1 / enemy2)。
 */
export type UnitSide = 'ally' | 'enemy'

/** ユニット ID から陣営を判定する */
export function getUnitSide(id: UnitId): UnitSide {
  return id === 'self' || id === 'ally' ? 'ally' : 'enemy'
}

/**
 * 8 方向の度数リスト (0° = 上、時計回り 45° 刻み)。
 *
 * Phase 7 (Issue #8) で導入: DirectionPicker / UnitToken の矢印描画から参照する。
 *
 * 「方向は 8 値リテラル」というゲームドメインの定数なので constants/game.ts に置く
 * (描画寸法は constants/board.ts、ドメイン定数は constants/game.ts という責務分担)。
 *
 * 並びは Direction 型の宣言順 (types/board.ts) と一致させ、SVG の角度系
 * (0 = 上 / 時計回り) を直接表す。
 */
export const DIRECTIONS_8: readonly Direction[] = [
  0, 45, 90, 135, 180, 225, 270, 315,
]

/**
 * 各方向のアクセシビリティラベル。
 * DirectionPicker の `aria-label` と `<title>` で使う。
 */
export const DIRECTION_LABELS: Record<Direction, string> = {
  0: '上向き',
  45: '右上向き',
  90: '右向き',
  135: '右下向き',
  180: '下向き',
  225: '左下向き',
  270: '左向き',
  315: '左上向き',
}

export const UNIT_LABELS: Record<UnitId, string> = {
  self: '自機',
  ally: '相方',
  enemy1: '敵1',
  enemy2: '敵2',
}

export const UNIT_COLORS: Record<UnitId, string> = {
  self: '#38bdf8', // sky-400
  ally: '#2563eb', // blue-600
  enemy1: '#ef4444', // red-500
  enemy2: '#f43f5e', // rose-500
}

export const COSTS: readonly Cost[] = [1.5, 2, 2.5, 3]

export const STARBURST_LEVELS: readonly StarburstLevel[] = ['none', 'half', 'full']

export const STARBURST_LABELS: Record<StarburstLevel, string> = {
  none: 'なし',
  half: '半覚',
  full: '全覚',
}

export interface CoreTypeMeta {
  id: CoreType
  label: string
  color: string
}

/**
 * コア種別 → メタ情報のマップ (id 引き用)。
 *
 * このオブジェクトが「コア種別の唯一の source of truth」。
 * `satisfies Record<CoreType, CoreTypeMeta>` によって、CoreType に新しい
 * 値を追加したとき compile error でキー漏れを検出できる。
 */
export const CORE_TYPE_BY_ID = {
  F: { id: 'F', label: '格闘', color: '#ef4444' }, // 赤
  S: { id: 'S', label: '射撃', color: '#3b82f6' }, // 青
  M: { id: 'M', label: '機動', color: '#eab308' }, // 黄
  D: { id: 'D', label: '防御', color: '#22c55e' }, // 緑
  B: { id: 'B', label: 'バランス', color: '#e2e8f0' }, // 白
  C: { id: 'C', label: 'カバーリング', color: '#a855f7' }, // 紫
} as const satisfies Record<CoreType, CoreTypeMeta>

/**
 * 表示順を保持したコア種別リスト (UI のボタン並び順)。
 * CORE_TYPE_BY_ID からこの順で引いた派生配列。
 */
const CORE_TYPE_ORDER: readonly CoreType[] = ['F', 'S', 'M', 'D', 'B', 'C']

export const CORE_TYPES: readonly CoreTypeMeta[] = CORE_TYPE_ORDER.map(
  (id) => CORE_TYPE_BY_ID[id],
)

/**
 * 初期配置: 味方 (self, ally) は下、敵 (enemy1, enemy2) は上のダイヤモンド配置。
 * SVG viewBox は 720x720。
 */
export const DEFAULT_POSITIONS: Record<UnitId, { x: number; y: number }> = {
  self: { x: 260, y: 460 },
  ally: { x: 460, y: 460 },
  enemy1: { x: 260, y: 260 },
  enemy2: { x: 460, y: 260 },
}

function makeDefaultUnit(id: UnitId): Unit {
  return {
    id,
    x: DEFAULT_POSITIONS[id].x,
    y: DEFAULT_POSITIONS[id].y,
    direction: id === 'self' || id === 'ally' ? 0 : 180,
    cost: 3,
    starburst: 'none',
    coreType: 'B',
    lockTarget: null,
    // 初期は機体未選択。InspectorPanel で選ぶと cost が自動同期される (Issue #55)
    characterId: null,
  }
}

/**
 * チーム残コストの初期値・範囲・刻み (Issue #60)。
 *
 * EXVS2 系は最大コスト 6 から開始し、撃墜で減っていく。0.5 刻みで手動入力する。
 */
export const TEAM_REMAINING_COST_MAX = 6
export const TEAM_REMAINING_COST_MIN = 0
export const TEAM_REMAINING_COST_STEP = 0.5

export const INITIAL_BOARD_STATE: BoardState = {
  units: {
    self: makeDefaultUnit('self'),
    ally: makeDefaultUnit('ally'),
    enemy1: makeDefaultUnit('enemy1'),
    enemy2: makeDefaultUnit('enemy2'),
  },
  teamRemainingCost: {
    ally: TEAM_REMAINING_COST_MAX,
    enemy: TEAM_REMAINING_COST_MAX,
  },
}
