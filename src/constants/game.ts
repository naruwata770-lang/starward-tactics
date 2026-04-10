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
  StarburstLevel,
  Unit,
  UnitId,
} from '../types/board'

export const UNIT_IDS: readonly UnitId[] = ['self', 'ally', 'enemy1', 'enemy2']

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

export const CORE_TYPES: readonly CoreTypeMeta[] = [
  { id: 'F', label: '格闘', color: '#ef4444' }, // 赤
  { id: 'S', label: '射撃', color: '#3b82f6' }, // 青
  { id: 'M', label: '機動', color: '#eab308' }, // 黄
  { id: 'D', label: '防御', color: '#22c55e' }, // 緑
  { id: 'B', label: 'バランス', color: '#e2e8f0' }, // 白
  { id: 'C', label: 'カバーリング', color: '#a855f7' }, // 紫
]

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
  }
}

export const INITIAL_BOARD_STATE: BoardState = {
  units: {
    self: makeDefaultUnit('self'),
    ally: makeDefaultUnit('ally'),
    enemy1: makeDefaultUnit('enemy1'),
    enemy2: makeDefaultUnit('enemy2'),
  },
}
