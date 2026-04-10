/**
 * urlCodec の round-trip / バリデーション / URL 長 を検証。
 *
 * Phase 5 Issue #6 の完了条件:
 * - round-trip: encode → decode で同じ state が得られる
 * - 不正な入力で null
 * - 古いバージョンのフォーマットも decode できる (将来用、今は v1 だけ)
 * - URL 長が 2000 文字を超えないこと
 */

import { describe, expect, it } from 'vitest'

import {
  UNIT_COORD_X_MAX,
  UNIT_COORD_X_MIN,
  UNIT_COORD_Y_MAX,
  UNIT_COORD_Y_MIN,
} from '../constants/board'
import { INITIAL_BOARD_STATE } from '../constants/game'
import {
  SCHEMA_VERSION,
  decode,
  decodeV1,
  decodeV1Unit,
  encode,
  encodeV1,
  isInitialEncoded,
} from '../state/urlCodec'
import type { BoardState, Unit } from '../types/board'

function withUnit(state: BoardState, patch: Partial<Unit>): BoardState {
  return {
    units: {
      ...state.units,
      self: { ...state.units.self, ...patch },
    },
  }
}

describe('urlCodec', () => {
  describe('encode / decode round-trip', () => {
    it('returns INITIAL_BOARD_STATE for the default round-trip', () => {
      const encoded = encode(INITIAL_BOARD_STATE)
      const decoded = decode(encoded)
      expect(decoded).toEqual(INITIAL_BOARD_STATE)
    })

    it('round-trips with all fields modified', () => {
      const custom: BoardState = {
        units: {
          self: {
            id: 'self',
            x: 100,
            y: 200,
            direction: 45,
            cost: 1.5,
            starburst: 'half',
            coreType: 'F',
            lockTarget: 'enemy1',
          },
          ally: {
            id: 'ally',
            x: 300,
            y: 400,
            direction: 90,
            cost: 2,
            starburst: 'full',
            coreType: 'S',
            lockTarget: 'enemy2',
          },
          enemy1: {
            id: 'enemy1',
            x: 500,
            y: 100,
            direction: 180,
            cost: 2.5,
            starburst: 'none',
            coreType: 'M',
            lockTarget: 'self',
          },
          enemy2: {
            id: 'enemy2',
            x: 200,
            y: 600,
            direction: 270,
            cost: 3,
            starburst: 'half',
            coreType: 'D',
            lockTarget: null,
          },
        },
      }
      const decoded = decode(encode(custom))
      expect(decoded).toEqual(custom)
    })

    it('round-trips integer coordinates near the safe range boundaries', () => {
      // urlCodec は整数化した範囲 [ceil(MIN), floor(MAX)] を使う。
      // UNIT_COORD_*_{MIN,MAX} は浮動小数を含むので、テスト側でも整数化した
      // 値を使って検証する。
      const xMinInt = Math.ceil(UNIT_COORD_X_MIN)
      const xMaxInt = Math.floor(UNIT_COORD_X_MAX)
      const yMinInt = Math.ceil(UNIT_COORD_Y_MIN)
      const yMaxInt = Math.floor(UNIT_COORD_Y_MAX)

      const minState = withUnit(INITIAL_BOARD_STATE, { x: xMinInt, y: yMinInt })
      expect(decode(encode(minState))?.units.self).toEqual(minState.units.self)

      const maxState = withUnit(INITIAL_BOARD_STATE, { x: xMaxInt, y: yMaxInt })
      expect(decode(encode(maxState))?.units.self).toEqual(maxState.units.self)
    })

    it('clamps coordinates outside the integer safe range during encode', () => {
      // 範囲外の入力を渡しても encode 側で clamp されるので decode は成功する
      // (ただし decode 結果は clamp された値になる)
      const overflow = withUnit(INITIAL_BOARD_STATE, { x: 9999, y: -100 })
      const decoded = decode(encode(overflow))
      expect(decoded?.units.self.x).toBe(Math.floor(UNIT_COORD_X_MAX))
      expect(decoded?.units.self.y).toBe(Math.ceil(UNIT_COORD_Y_MIN))
    })

    it('rounds non-integer coordinates before encoding', () => {
      // Math.round で整数化されるので、decode 結果は丸められた値になる
      const fractional = withUnit(INITIAL_BOARD_STATE, { x: 100.7, y: 200.4 })
      const decoded = decode(encode(fractional))
      expect(decoded?.units.self.x).toBe(101)
      expect(decoded?.units.self.y).toBe(200)
    })

    it('encodes every cost value distinctly', () => {
      // cost の lookup table が 4 値全てに対応していることの保証
      const costs = [1.5, 2, 2.5, 3] as const
      for (const cost of costs) {
        const state = withUnit(INITIAL_BOARD_STATE, { cost })
        expect(decode(encode(state))?.units.self.cost).toBe(cost)
      }
    })

    it('encodes every direction value distinctly', () => {
      const directions = [0, 45, 90, 135, 180, 225, 270, 315] as const
      for (const direction of directions) {
        const state = withUnit(INITIAL_BOARD_STATE, { direction })
        expect(decode(encode(state))?.units.self.direction).toBe(direction)
      }
    })
  })

  describe('decode rejects invalid input', () => {
    it('returns null for an empty string', () => {
      expect(decode('')).toBeNull()
    })

    it('returns null when the version prefix is missing', () => {
      expect(decode('justrandomstring')).toBeNull()
    })

    it('returns null for an unknown version', () => {
      expect(decode('v0.xxxx')).toBeNull()
      expect(decode('v2.xxxx')).toBeNull()
    })

    it('returns null for invalid base64url', () => {
      expect(decode('v1.@@@@@')).toBeNull()
    })

    it('returns null when unit count is wrong', () => {
      expect(decodeV1('260,460,0,d,n,B,_|460,460,0,d,n,B,_')).toBeNull()
    })

    it('returns null when a unit field count is wrong', () => {
      // 6 fields instead of 7
      expect(
        decodeV1('260,460,0,d,n,B|460,460,0,d,n,B,_|260,260,4,d,n,B,_|460,260,4,d,n,B,_'),
      ).toBeNull()
    })

    it('returns null for out-of-range cost token', () => {
      expect(
        decodeV1Unit(['260', '460', '0', 'z', 'n', 'B', '_'], 'self'),
      ).toBeNull()
    })

    it('returns null for out-of-range starburst token', () => {
      expect(
        decodeV1Unit(['260', '460', '0', 'd', 'x', 'B', '_'], 'self'),
      ).toBeNull()
    })

    it('returns null for unknown core type', () => {
      expect(
        decodeV1Unit(['260', '460', '0', 'd', 'n', 'Z', '_'], 'self'),
      ).toBeNull()
    })

    it('returns null for unknown lock target token', () => {
      expect(
        decodeV1Unit(['260', '460', '0', 'd', 'n', 'B', 'x'], 'self'),
      ).toBeNull()
    })

    it('returns null for self-locking', () => {
      // self の lockTarget を s (self) にする
      expect(
        decodeV1Unit(['260', '460', '0', 'd', 'n', 'B', 's'], 'self'),
      ).toBeNull()
    })

    it('returns null for direction index out of range', () => {
      expect(
        decodeV1Unit(['260', '460', '8', 'd', 'n', 'B', '_'], 'self'),
      ).toBeNull()
      expect(
        decodeV1Unit(['260', '460', '-1', 'd', 'n', 'B', '_'], 'self'),
      ).toBeNull()
    })

    it('returns null for non-integer coordinates', () => {
      // parseFloat の通り抜けを許さない
      expect(
        decodeV1Unit(['12abc', '460', '0', 'd', 'n', 'B', '_'], 'self'),
      ).toBeNull()
      expect(
        decodeV1Unit(['260.5', '460', '0', 'd', 'n', 'B', '_'], 'self'),
      ).toBeNull()
    })

    it('returns null for coordinates outside the safe range', () => {
      // clamp に頼らず decode で reject する
      expect(
        decodeV1Unit(['0', '460', '0', 'd', 'n', 'B', '_'], 'self'),
      ).toBeNull()
      expect(
        decodeV1Unit(['260', '9999', '0', 'd', 'n', 'B', '_'], 'self'),
      ).toBeNull()
    })
  })

  describe('URL length budget', () => {
    it('keeps the encoded URL well under 2000 characters even at boundaries', () => {
      // 全ユニット最大値で encode しても URL 全体 (?b= 含む) が短いことを保証
      const heavy: BoardState = {
        units: {
          self: { ...INITIAL_BOARD_STATE.units.self, x: UNIT_COORD_X_MAX, y: UNIT_COORD_Y_MAX, lockTarget: 'enemy2' },
          ally: { ...INITIAL_BOARD_STATE.units.ally, x: UNIT_COORD_X_MAX, y: UNIT_COORD_Y_MAX, lockTarget: 'enemy1' },
          enemy1: { ...INITIAL_BOARD_STATE.units.enemy1, x: UNIT_COORD_X_MAX, y: UNIT_COORD_Y_MAX, lockTarget: 'self' },
          enemy2: { ...INITIAL_BOARD_STATE.units.enemy2, x: UNIT_COORD_X_MAX, y: UNIT_COORD_Y_MAX, lockTarget: 'ally' },
        },
      }
      const url = `?b=${encode(heavy)}`
      expect(url.length).toBeLessThan(200)
    })
  })

  describe('isInitialEncoded', () => {
    it('returns true for INITIAL_BOARD_STATE', () => {
      expect(isInitialEncoded(encode(INITIAL_BOARD_STATE))).toBe(true)
    })

    it('returns false when any field differs from initial', () => {
      const moved = withUnit(INITIAL_BOARD_STATE, { x: 100 })
      expect(isInitialEncoded(encode(moved))).toBe(false)
    })
  })

  describe('schema version', () => {
    it('encode prefixes with the current SCHEMA_VERSION', () => {
      expect(encode(INITIAL_BOARD_STATE).startsWith(`${SCHEMA_VERSION}.`)).toBe(true)
    })

    it('encodeV1 produces an ASCII-only payload', () => {
      // payload は ASCII (略号 + 数字 + カンマ + パイプ) のみ
      const payload = encodeV1(INITIAL_BOARD_STATE)
      // eslint-disable-next-line no-control-regex
      expect(/^[\x00-\x7F]*$/.test(payload)).toBe(true)
    })
  })
})
