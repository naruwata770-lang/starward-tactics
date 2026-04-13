/**
 * lockLineGeometry の幾何テスト (Phase 8)。
 *
 * 検証目的:
 * 1. 始点・終点が円表面 (UNIT_RADIUS 分のオフセット) に来ること
 * 2. 色・マーカー ID がソースの陣営で正しく決まること
 * 3. 距離が MIN_SHAFT_LENGTH 未満の場合に null を返すこと
 * 4. 斜め方向でも正しく計算されること
 */

import { describe, expect, it } from 'vitest'

import {
  LOCK_LINE_ALLY_COLOR,
  LOCK_LINE_ENEMY_COLOR,
  LOCK_LINE_MIN_SHAFT_LENGTH,
  UNIT_RADIUS,
} from '../constants/board'
import type { Unit } from '../types/board'
import { getLockLineGeometry } from '../components/board/lockLineGeometry'
import { LOCK_ARROW_ALLY_ID, LOCK_ARROW_ENEMY_ID } from '../components/board/SvgDefs'

/** テスト用のユニット生成ヘルパー */
function makeUnit(overrides: Partial<Unit> & Pick<Unit, 'id' | 'x' | 'y'>): Unit {
  return {
    direction: 0,
    cost: 3,
    starburst: 'none',
    coreType: 'B',
    lockTarget: null,
    characterId: null,
    ...overrides,
  }
}

describe('getLockLineGeometry', () => {
  describe('始点・終点のオフセット', () => {
    it('水平方向: ソース右→ターゲットで始点が UNIT_RADIUS 分右、終点が UNIT_RADIUS 分左にオフセットされる', () => {
      const source = makeUnit({ id: 'self', x: 100, y: 300 })
      const target = makeUnit({ id: 'enemy1', x: 300, y: 300 })
      const result = getLockLineGeometry(source, target)

      expect(result).not.toBeNull()
      // 距離 200, 方向 (1, 0)
      expect(result!.x1).toBeCloseTo(100 + UNIT_RADIUS)
      expect(result!.y1).toBeCloseTo(300)
      expect(result!.x2).toBeCloseTo(300 - UNIT_RADIUS)
      expect(result!.y2).toBeCloseTo(300)
    })

    it('垂直方向: ソース下→ターゲットで正しくオフセットされる', () => {
      const source = makeUnit({ id: 'self', x: 300, y: 100 })
      const target = makeUnit({ id: 'enemy1', x: 300, y: 400 })
      const result = getLockLineGeometry(source, target)

      expect(result).not.toBeNull()
      expect(result!.x1).toBeCloseTo(300)
      expect(result!.y1).toBeCloseTo(100 + UNIT_RADIUS)
      expect(result!.x2).toBeCloseTo(300)
      expect(result!.y2).toBeCloseTo(400 - UNIT_RADIUS)
    })

    it('斜め方向: 45度で正しくオフセットされる', () => {
      const source = makeUnit({ id: 'self', x: 100, y: 100 })
      const target = makeUnit({ id: 'enemy1', x: 300, y: 300 })
      const result = getLockLineGeometry(source, target)

      expect(result).not.toBeNull()
      const diag = UNIT_RADIUS / Math.SQRT2
      expect(result!.x1).toBeCloseTo(100 + diag)
      expect(result!.y1).toBeCloseTo(100 + diag)
      expect(result!.x2).toBeCloseTo(300 - diag)
      expect(result!.y2).toBeCloseTo(300 - diag)
    })
  })

  describe('色・マーカー ID の陣営ルール', () => {
    it('self (味方) → enemy1: 青 + ally マーカー', () => {
      const source = makeUnit({ id: 'self', x: 100, y: 300 })
      const target = makeUnit({ id: 'enemy1', x: 400, y: 300 })
      const result = getLockLineGeometry(source, target)!

      expect(result.color).toBe(LOCK_LINE_ALLY_COLOR)
      expect(result.markerId).toBe(LOCK_ARROW_ALLY_ID)
    })

    it('ally (味方) → enemy2: 青 + ally マーカー', () => {
      const source = makeUnit({ id: 'ally', x: 100, y: 300 })
      const target = makeUnit({ id: 'enemy2', x: 400, y: 300 })
      const result = getLockLineGeometry(source, target)!

      expect(result.color).toBe(LOCK_LINE_ALLY_COLOR)
      expect(result.markerId).toBe(LOCK_ARROW_ALLY_ID)
    })

    it('enemy1 (敵) → self: 赤 + enemy マーカー', () => {
      const source = makeUnit({ id: 'enemy1', x: 100, y: 300 })
      const target = makeUnit({ id: 'self', x: 400, y: 300 })
      const result = getLockLineGeometry(source, target)!

      expect(result.color).toBe(LOCK_LINE_ENEMY_COLOR)
      expect(result.markerId).toBe(LOCK_ARROW_ENEMY_ID)
    })

    it('enemy2 (敵) → ally: 赤 + enemy マーカー', () => {
      const source = makeUnit({ id: 'enemy2', x: 100, y: 300 })
      const target = makeUnit({ id: 'ally', x: 400, y: 300 })
      const result = getLockLineGeometry(source, target)!

      expect(result.color).toBe(LOCK_LINE_ENEMY_COLOR)
      expect(result.markerId).toBe(LOCK_ARROW_ENEMY_ID)
    })

    it('味方→味方 (self → ally): ソース陣営で青になる', () => {
      const source = makeUnit({ id: 'self', x: 100, y: 300 })
      const target = makeUnit({ id: 'ally', x: 400, y: 300 })
      const result = getLockLineGeometry(source, target)!

      expect(result.color).toBe(LOCK_LINE_ALLY_COLOR)
    })

    it('敵→敵 (enemy1 → enemy2): ソース陣営で赤になる', () => {
      const source = makeUnit({ id: 'enemy1', x: 100, y: 300 })
      const target = makeUnit({ id: 'enemy2', x: 400, y: 300 })
      const result = getLockLineGeometry(source, target)!

      expect(result.color).toBe(LOCK_LINE_ENEMY_COLOR)
    })
  })

  describe('距離ガード', () => {
    it('ユニット同士が重なっている (距離 0) → null', () => {
      const source = makeUnit({ id: 'self', x: 300, y: 300 })
      const target = makeUnit({ id: 'enemy1', x: 300, y: 300 })

      expect(getLockLineGeometry(source, target)).toBeNull()
    })

    it('ちょうど閾値 (UNIT_RADIUS * 2 + MIN_SHAFT_LENGTH) → null', () => {
      const threshold = UNIT_RADIUS * 2 + LOCK_LINE_MIN_SHAFT_LENGTH
      const source = makeUnit({ id: 'self', x: 100, y: 300 })
      const target = makeUnit({ id: 'enemy1', x: 100 + threshold, y: 300 })

      expect(getLockLineGeometry(source, target)).toBeNull()
    })

    it('閾値をわずかに超える → 有効な geometry を返す', () => {
      const threshold = UNIT_RADIUS * 2 + LOCK_LINE_MIN_SHAFT_LENGTH
      const source = makeUnit({ id: 'self', x: 100, y: 300 })
      const target = makeUnit({ id: 'enemy1', x: 100 + threshold + 1, y: 300 })

      expect(getLockLineGeometry(source, target)).not.toBeNull()
    })
  })

  describe('始点・終点の不変条件', () => {
    it('始点と終点の間の距離は元の距離 - UNIT_RADIUS * 2 に等しい', () => {
      const source = makeUnit({ id: 'self', x: 150, y: 200 })
      const target = makeUnit({ id: 'enemy1', x: 500, y: 450 })
      const result = getLockLineGeometry(source, target)!

      const originalDist = Math.sqrt(
        (target.x - source.x) ** 2 + (target.y - source.y) ** 2,
      )
      const lineDist = Math.sqrt(
        (result.x2 - result.x1) ** 2 + (result.y2 - result.y1) ** 2,
      )

      expect(lineDist).toBeCloseTo(originalDist - UNIT_RADIUS * 2)
    })
  })
})
