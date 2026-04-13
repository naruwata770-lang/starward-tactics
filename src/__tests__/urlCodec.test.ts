/**
 * urlCodec の round-trip / バリデーション / URL 長 を検証。
 *
 * Phase 5 Issue #6 で v1 を導入。
 * Issue #55 で v2 (セクション分割 + characterCode trailing optional) を導入。
 */

import { describe, expect, it } from 'vitest'

import {
  UNIT_COORD_X_MAX,
  UNIT_COORD_X_MIN,
  UNIT_COORD_Y_MAX,
  UNIT_COORD_Y_MIN,
} from '../constants/board'
import { INITIAL_BOARD_STATE } from '../constants/game'
import { CHARACTERS } from '../data/characters'
import {
  SCHEMA_VERSION,
  decode,
  decodeV1,
  decodeV1Unit,
  decodeV2,
  encode,
  encodeV1,
  encodeV2,
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

/** base64url helper for tests (raw payload を URL prefix に組み立てる) */
function b64url(ascii: string): string {
  const b64 = btoa(ascii)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
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
            characterId: null,
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
            characterId: null,
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
            characterId: null,
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
            characterId: null,
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
      expect(decode('v3.xxxx')).toBeNull()
    })

    it('returns null for invalid base64url', () => {
      expect(decode('v1.@@@@@')).toBeNull()
      expect(decode('v2.@@@@@')).toBeNull()
    })

    it('returns null when unit count is wrong', () => {
      expect(decodeV1('260,460,0,d,n,B,_|460,460,0,d,n,B,_')).toBeNull()
    })

    it('returns null when a unit field count is wrong', () => {
      // 6 fields instead of 7 (v1 は厳密に 7 フィールドを要求)
      expect(
        decodeV1('260,460,0,d,n,B|460,460,0,d,n,B,_|260,260,4,d,n,B,_|460,260,4,d,n,B,_'),
      ).toBeNull()
    })

    it('v1 also rejects 8 fields (trailing optional は v2 の挙動)', () => {
      expect(
        decodeV1Unit(['260', '460', '0', 'd', 'n', 'B', '_', '01'], 'self'),
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
      // 全ユニット最大値 + 全ユニット characterId で encode しても URL 全体 (?b= 含む) が
      // 短いことを保証 (v2 で characterCode が trailing として乗っても許容範囲か)
      const heavy: BoardState = {
        units: {
          self: { ...INITIAL_BOARD_STATE.units.self, x: UNIT_COORD_X_MAX, y: UNIT_COORD_Y_MAX, lockTarget: 'enemy2', characterId: CHARACTERS[0].id },
          ally: { ...INITIAL_BOARD_STATE.units.ally, x: UNIT_COORD_X_MAX, y: UNIT_COORD_Y_MAX, lockTarget: 'enemy1', characterId: CHARACTERS[1].id },
          enemy1: { ...INITIAL_BOARD_STATE.units.enemy1, x: UNIT_COORD_X_MAX, y: UNIT_COORD_Y_MAX, lockTarget: 'self', characterId: CHARACTERS[2].id },
          enemy2: { ...INITIAL_BOARD_STATE.units.enemy2, x: UNIT_COORD_X_MAX, y: UNIT_COORD_Y_MAX, lockTarget: 'ally', characterId: CHARACTERS[3].id },
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
    it('encode prefixes with the current SCHEMA_VERSION (v2)', () => {
      expect(encode(INITIAL_BOARD_STATE).startsWith(`${SCHEMA_VERSION}.`)).toBe(true)
      expect(SCHEMA_VERSION).toBe('v2')
    })

    it('encodeV1 produces an ASCII-only payload', () => {
      // payload は ASCII (略号 + 数字 + カンマ + パイプ) のみ
      const payload = encodeV1(INITIAL_BOARD_STATE)
      // eslint-disable-next-line no-control-regex
      expect(/^[\x00-\x7F]*$/.test(payload)).toBe(true)
    })

    it('encodeV2 produces an ASCII-only payload', () => {
      const payload = encodeV2(INITIAL_BOARD_STATE)
      // eslint-disable-next-line no-control-regex
      expect(/^[\x00-\x7F]*$/.test(payload)).toBe(true)
    })

    it('encodeV2 starts with the u= section prefix', () => {
      expect(encodeV2(INITIAL_BOARD_STATE).startsWith('u=')).toBe(true)
    })
  })

  describe('v2 codec', () => {
    it('round-trips via decode(encode(state))', () => {
      const state = withUnit(INITIAL_BOARD_STATE, {
        characterId: CHARACTERS[0].id,
        cost: CHARACTERS[0].cost,
      })
      expect(decode(encode(state))).toEqual(state)
    })

    it('encodes characterCode as trailing field after the fixed 7', () => {
      // 1 ユニットだけ characterId を入れて、payload に code が現れることを確認
      const state = withUnit(INITIAL_BOARD_STATE, {
        characterId: CHARACTERS[0].id,
        cost: CHARACTERS[0].cost,
      })
      const payload = encodeV2(state)
      const selfChunk = payload.replace(/^u=/, '').split('|')[0]
      const fields = selfChunk.split(',')
      expect(fields).toHaveLength(8)
      expect(fields[7]).toBe(CHARACTERS[0].code)
    })

    it('encodes empty characterCode for null characterId', () => {
      const payload = encodeV2(INITIAL_BOARD_STATE)
      const selfChunk = payload.replace(/^u=/, '').split('|')[0]
      const fields = selfChunk.split(',')
      expect(fields).toHaveLength(8)
      expect(fields[7]).toBe('')
    })

    it('decodeV2 falls back to characterId=null for unknown code without rejecting state', () => {
      const fixed = '260,460,0,d,n,B,_'
      const payload = `u=${fixed},ZZ|${fixed},|${fixed},|${fixed},`
      const state = decodeV2(payload)
      expect(state).not.toBeNull()
      expect(state?.units.self.characterId).toBeNull()
    })

    it('decodeV2 ignores extra trailing fields (forward compat for #A hp/boost)', () => {
      // 9, 10 番目のフィールドは未来の hp/boost を想定して ignore
      const fixed = '260,460,0,d,n,B,_'
      const code = CHARACTERS[0].code
      const payload = `u=${fixed},${code},9999,8888|${fixed},|${fixed},|${fixed},`
      const state = decodeV2(payload)
      expect(state).not.toBeNull()
      expect(state?.units.self.characterId).toBe(CHARACTERS[0].id)
    })

    it('decodeV2 ignores unknown prefix sections (forward compat)', () => {
      const fixed = '260,460,0,d,n,B,_'
      const payload = `u=${fixed},|${fixed},|${fixed},|${fixed},;tc=6,6;futureKey=anything`
      const state = decodeV2(payload)
      expect(state).not.toBeNull()
    })

    it('decodeV2 rejects when u= section is missing', () => {
      expect(decodeV2('tc=6,6')).toBeNull()
    })

    it('decodeV2 rejects duplicate u= section', () => {
      const fixed = '260,460,0,d,n,B,_'
      const payload = `u=${fixed},|${fixed},|${fixed},|${fixed},;u=${fixed},|${fixed},|${fixed},|${fixed},`
      expect(decodeV2(payload)).toBeNull()
    })

    it('decodeV2 rejects malformed section without =', () => {
      expect(decodeV2('uvalue')).toBeNull()
    })

    it('decodeV2 rejects empty payload', () => {
      expect(decodeV2('')).toBeNull()
    })

    it('decodeV2 rejects when u= has wrong number of units', () => {
      const fixed = '260,460,0,d,n,B,_,'
      expect(decodeV2(`u=${fixed}|${fixed}`)).toBeNull()
    })

    it('decodeV2 rejects when fixed 7 fields are missing (no leniency on prefix)', () => {
      // 6 fields in self unit
      const broken = '260,460,0,d,n,B'
      const ok = '260,460,0,d,n,B,_,'
      expect(decodeV2(`u=${broken}|${ok}|${ok}|${ok}`)).toBeNull()
    })

    it('decodeV2 rejects when fixed 7 fields contain invalid values', () => {
      const broken = '260,460,0,z,n,B,_,' // cost token z is invalid
      const ok = '260,460,0,d,n,B,_,'
      expect(decodeV2(`u=${broken}|${ok}|${ok}|${ok}`)).toBeNull()
    })

    it('decode dispatches v1 to decodeV1 (backward compat: characterId=null)', () => {
      // v1 payload を直接組み立てて decode
      const v1Payload = '260,460,0,d,n,B,_|460,460,0,d,n,B,_|260,260,4,d,n,B,_|460,260,4,d,n,B,_'
      const v1Url = `v1.${b64url(v1Payload)}`
      const decoded = decode(v1Url)
      expect(decoded).not.toBeNull()
      expect(decoded?.units.self.characterId).toBeNull()
      expect(decoded?.units.ally.characterId).toBeNull()
      expect(decoded?.units.enemy1.characterId).toBeNull()
      expect(decoded?.units.enemy2.characterId).toBeNull()
    })
  })
})
