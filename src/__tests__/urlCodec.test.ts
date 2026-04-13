/**
 * urlCodec の round-trip / バリデーション / URL 長 を検証。
 *
 * Phase 5 Issue #6 で v1 を導入。
 * Issue #55 で v2 (セクション分割 + characterCode trailing optional) を導入。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  normalizeBoardState,
} from '../state/urlCodec'
import type { BoardState, Unit } from '../types/board'

function withUnit(state: BoardState, patch: Partial<Unit>): BoardState {
  return {
    ...state,
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
            hp: null,
            boost: 100,
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
            hp: null,
            boost: 100,
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
            hp: null,
            boost: 100,
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
            hp: null,
            boost: 100,
          },
        },
        teamRemainingCost: { ally: 6, enemy: 6 },
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
        teamRemainingCost: { ally: 0, enemy: 0 },
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
      // characterId と hp を整合させた状態 (normalize 後の正規形) で round-trip。
      // characterId set + hp=null は不整合状態なので、decode 後の normalize で
      // hp=maxHp に補正されてしまう (Issue #58 仕様)。
      const state = withUnit(INITIAL_BOARD_STATE, {
        characterId: CHARACTERS[0].id,
        cost: CHARACTERS[0].cost,
        hp: CHARACTERS[0].maxHp,
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

    it('decodeV2 ignores 11+ trailing fields (forward compat for future schema additions)', () => {
      // Issue #58 で 9 番目 = hp, 10 番目 = boost を採用したため、forward compat
      // 範囲は 11 番目以降に縮まる。9 番目 500 / 10 番目 88 は valid な値で、
      // 11 番目以降の "futureA" は ignore されることを確認する。
      // (decodeV2 単体では normalize は通らないので raw 値が出る点に注意。
      //  normalize の挙動は別 describe `normalizeBoardState` で検証する。)
      const fixed = '260,460,0,d,n,B,_'
      const code = CHARACTERS[0].code
      const payload = `u=${fixed},${code},500,88,futureA|${fixed},|${fixed},|${fixed},`
      const state = decodeV2(payload)
      expect(state).not.toBeNull()
      expect(state?.units.self.characterId).toBe(CHARACTERS[0].id)
      expect(state?.units.self.hp).toBe(500)
      expect(state?.units.self.boost).toBe(88)
    })

    it('decodeV2 ignores unknown prefix sections (forward compat)', () => {
      const fixed = '260,460,0,d,n,B,_'
      const payload = `u=${fixed},|${fixed},|${fixed},|${fixed},;tc=6,6;futureKey=anything`
      const state = decodeV2(payload)
      expect(state).not.toBeNull()
    })

    it('decodeV2 accepts trailing semicolon (lenient skip of empty sections)', () => {
      // Codex/Gemini レビュー[共通] 反映: 末尾 `;` や連続 `;;` は forward compat で skip
      const fixed = '260,460,0,d,n,B,_'
      const payload = `u=${fixed},|${fixed},|${fixed},|${fixed},;`
      const state = decodeV2(payload)
      expect(state).not.toBeNull()
    })

    it('decodeV2 accepts consecutive semicolons between sections', () => {
      const fixed = '260,460,0,d,n,B,_'
      const payload = `u=${fixed},|${fixed},|${fixed},|${fixed},;;tc=6,6`
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

    it('Issue #60: v1 decode falls back to teamRemainingCost (6, 6)', () => {
      const v1Payload = '260,460,0,d,n,B,_|460,460,0,d,n,B,_|260,260,4,d,n,B,_|460,260,4,d,n,B,_'
      const v1Url = `v1.${b64url(v1Payload)}`
      const decoded = decode(v1Url)
      expect(decoded?.teamRemainingCost).toEqual({ ally: 6, enemy: 6 })
    })
  })

  // Issue #60
  describe('teamRemainingCost (v2 tc= section)', () => {
    it('encodeV2 omits the tc= section at the initial (6, 6) value', () => {
      // 初期値は省略することで既存共有 URL との文字列互換を保つ
      const payload = encodeV2(INITIAL_BOARD_STATE)
      expect(payload).not.toMatch(/;tc=/)
      expect(payload).toMatch(/^u=/)
    })

    it('encodeV2 writes the tc= section for non-initial values', () => {
      const state = withUnit(INITIAL_BOARD_STATE, {}) // start from initial
      const custom: BoardState = {
        ...state,
        teamRemainingCost: { ally: 4.5, enemy: 3 },
      }
      const payload = encodeV2(custom)
      expect(payload).toMatch(/;tc=4\.5,3/)
    })

    it('round-trips non-initial teamRemainingCost through encode/decode', () => {
      const custom: BoardState = {
        ...INITIAL_BOARD_STATE,
        teamRemainingCost: { ally: 2.5, enemy: 0 },
      }
      const decoded = decode(encode(custom))
      expect(decoded?.teamRemainingCost).toEqual({ ally: 2.5, enemy: 0 })
    })

    it('round-trips boundary values (0 and 6)', () => {
      const custom: BoardState = {
        ...INITIAL_BOARD_STATE,
        teamRemainingCost: { ally: 0, enemy: 6 },
      }
      const decoded = decode(encode(custom))
      expect(decoded?.teamRemainingCost).toEqual({ ally: 0, enemy: 6 })
    })

    it('decodeV2 falls back to (6, 6) when tc= section is missing', () => {
      const fixed = '260,460,0,d,n,B,_'
      const payload = `u=${fixed},|${fixed},|${fixed},|${fixed},`
      const state = decodeV2(payload)
      expect(state?.teamRemainingCost).toEqual({ ally: 6, enemy: 6 })
    })

    it('decodeV2 rejects tc= with non-numeric values', () => {
      const fixed = '260,460,0,d,n,B,_'
      const payload = `u=${fixed},|${fixed},|${fixed},|${fixed},;tc=abc,def`
      expect(decodeV2(payload)).toBeNull()
    })

    it('decodeV2 rejects tc= outside 0..6 range', () => {
      const fixed = '260,460,0,d,n,B,_'
      const payload = `u=${fixed},|${fixed},|${fixed},|${fixed},;tc=7,0`
      expect(decodeV2(payload)).toBeNull()
    })

    it('decodeV2 rejects tc= that violates 0.5 step', () => {
      const fixed = '260,460,0,d,n,B,_'
      const payload = `u=${fixed},|${fixed},|${fixed},|${fixed},;tc=3.2,3.0`
      expect(decodeV2(payload)).toBeNull()
    })

    it('decodeV2 rejects tc= with wrong value count', () => {
      const fixed = '260,460,0,d,n,B,_'
      const payload = `u=${fixed},|${fixed},|${fixed},|${fixed},;tc=6`
      expect(decodeV2(payload)).toBeNull()
    })

    it('decodeV2 rejects duplicate tc= section (parseV2Sections duplicate-key guard)', () => {
      const fixed = '260,460,0,d,n,B,_'
      const payload = `u=${fixed},|${fixed},|${fixed},|${fixed},;tc=6,6;tc=5,5`
      expect(decodeV2(payload)).toBeNull()
    })

    it('decodeV2 rejects empty tc= values (Number("") would silently coerce to 0)', () => {
      // Codex レビュー[中] 反映: Number() 任せだと "" → 0, " " → 0 が通る
      const fixed = '260,460,0,d,n,B,_'
      const base = `u=${fixed},|${fixed},|${fixed},|${fixed},`
      expect(decodeV2(`${base};tc=,`)).toBeNull()
      expect(decodeV2(`${base};tc=,6`)).toBeNull()
      expect(decodeV2(`${base};tc=6,`)).toBeNull()
      expect(decodeV2(`${base};tc= , `)).toBeNull()
    })

    it('decodeV2 rejects non-canonical numeric notations (5e-1 / 0x3 / leading zero)', () => {
      const fixed = '260,460,0,d,n,B,_'
      const base = `u=${fixed},|${fixed},|${fixed},|${fixed},`
      expect(decodeV2(`${base};tc=5e-1,6`)).toBeNull()
      expect(decodeV2(`${base};tc=0x3,0`)).toBeNull()
      expect(decodeV2(`${base};tc=06,6`)).toBeNull()
      expect(decodeV2(`${base};tc=+6,6`)).toBeNull()
      expect(decodeV2(`${base};tc=-1,6`)).toBeNull()
    })

    it('isInitialEncoded holds for the initial state after teamRemainingCost introduction', () => {
      // tc= 省略により INITIAL の文字列が従来と完全一致し続けることを保証
      expect(isInitialEncoded(encode(INITIAL_BOARD_STATE))).toBe(true)
    })
  })

  // ============================================================
  //  Issue #58: hp / boost フィールド
  // ============================================================

  describe('Issue #58: v1 → v2 正規化 (hp=null, boost=100 のデフォルト注入)', () => {
    // 既知の v1 raw payload を hardcode (Codex 提案[共通・中] 反映:
    // encoder を経由しないことで「encoder のバグで test が見えない回帰」を防ぐ)。
    const V1_FIXED_PAYLOAD =
      '260,460,0,d,n,B,_|460,460,0,d,n,B,_|260,260,4,d,n,B,_|460,260,4,d,n,B,_'

    it('v1 URL を開いたら 全ユニット hp=null / boost=100 で復元される', () => {
      const v1Url = `v1.${b64url(V1_FIXED_PAYLOAD)}`
      const decoded = decode(v1Url)
      expect(decoded).not.toBeNull()
      for (const id of ['self', 'ally', 'enemy1', 'enemy2'] as const) {
        expect(decoded?.units[id].hp).toBeNull()
        expect(decoded?.units[id].boost).toBe(100)
      }
    })

    it('decodeV1Unit が hp=null / boost=100 を直接付与する', () => {
      const u = decodeV1Unit(['260', '460', '0', 'd', 'n', 'B', '_'], 'self')
      expect(u).not.toBeNull()
      expect(u?.hp).toBeNull()
      expect(u?.boost).toBe(100)
    })
  })

  describe('Issue #58: v2 末尾 hp/boost フィールドの trailing optional', () => {
    const FIXED_SELF = '260,460,0,d,n,B,_'
    const FIXED_ALLY = '460,460,0,d,n,B,_'
    const FIXED_E1 = '260,260,4,d,n,B,_'
    const FIXED_E2 = '460,260,4,d,n,B,_'
    function payload(self: string, ally = `${FIXED_ALLY},`, e1 = `${FIXED_E1},`, e2 = `${FIXED_E2},`) {
      return `u=${self}|${ally}|${e1}|${e2}`
    }

    it('8 fields (hp/boost 省略) → hp=null, boost=100', () => {
      const state = decodeV2(payload(`${FIXED_SELF},`))
      expect(state).not.toBeNull()
      expect(state?.units.self.hp).toBeNull()
      expect(state?.units.self.boost).toBe(100)
    })

    it('9 fields (hp あり, boost 省略) → boost=100', () => {
      const state = decodeV2(payload(`${FIXED_SELF},,400`))
      expect(state).not.toBeNull()
      // self は characterId 空文字 → null。hp は 9 番目 (index 8) = "400"
      // payload の 9 番目は "400" だが、上の payload 関数は characterCode 込みで
      // 数えると `260,460,0,d,n,B,_,,400` で 9 fields。これは characterCode="" + hp="400"
      expect(state?.units.self.characterId).toBeNull()
      expect(state?.units.self.hp).toBe(400)
      expect(state?.units.self.boost).toBe(100)
    })

    it('10 fields (hp 空文字, boost あり) → hp=null, boost=値', () => {
      const state = decodeV2(payload(`${FIXED_SELF},,,80`))
      expect(state).not.toBeNull()
      expect(state?.units.self.hp).toBeNull()
      expect(state?.units.self.boost).toBe(80)
    })

    it('10 fields (hp/boost 両方あり) → どちらも反映', () => {
      const state = decodeV2(payload(`${FIXED_SELF},,500,42`))
      expect(state).not.toBeNull()
      expect(state?.units.self.hp).toBe(500)
      expect(state?.units.self.boost).toBe(42)
    })

    it('reject: hp が非整数 ("abc")', () => {
      expect(decodeV2(payload(`${FIXED_SELF},,abc`))).toBeNull()
    })

    it('reject: hp が範囲外 (-1 / 10000)', () => {
      expect(decodeV2(payload(`${FIXED_SELF},,-1`))).toBeNull()
      expect(decodeV2(payload(`${FIXED_SELF},,10000`))).toBeNull()
    })

    it('reject: boost が範囲外 (101)', () => {
      expect(decodeV2(payload(`${FIXED_SELF},,400,101`))).toBeNull()
    })

    it('reject: boost が非整数 ("xyz")', () => {
      expect(decodeV2(payload(`${FIXED_SELF},,400,xyz`))).toBeNull()
    })

    it('hp=0 (撃破) は hp=null と完全に区別される (Codex/Gemini[共通・高] 反映)', () => {
      // hp=0 は数値 0 として decode され、null になってはいけない
      const state = decodeV2(payload(`${FIXED_SELF},,0`))
      expect(state).not.toBeNull()
      expect(state?.units.self.hp).toBe(0)
      expect(state?.units.self.hp).not.toBeNull()
      // hp が空文字なら null (こちらは null)
      const state2 = decodeV2(payload(`${FIXED_SELF},,`))
      expect(state2?.units.self.hp).toBeNull()
    })
  })

  describe('Issue #58: encoder 正規形ルール (Codex[共通・高] 反映)', () => {
    it('hp=null && boost=100 → 8 fields (省略形)', () => {
      const payload = encodeV2(INITIAL_BOARD_STATE)
      const selfChunk = payload.replace(/^u=/, '').split('|')[0]
      expect(selfChunk.split(',')).toHaveLength(8)
    })

    it('hp=number && boost=100 → 9 fields (boost 省略)', () => {
      const target = CHARACTERS[0]
      const state = withUnit(INITIAL_BOARD_STATE, {
        characterId: target.id,
        cost: target.cost,
        hp: 200,
      })
      const payload = encodeV2(state)
      const selfChunk = payload.replace(/^u=/, '').split('|')[0]
      const fields = selfChunk.split(',')
      expect(fields).toHaveLength(9)
      expect(fields[7]).toBe(target.code)
      expect(fields[8]).toBe('200')
    })

    it('hp=null && boost!=100 → 10 fields (hp 空文字, boost あり)', () => {
      const state = withUnit(INITIAL_BOARD_STATE, { boost: 50 })
      const payload = encodeV2(state)
      const selfChunk = payload.replace(/^u=/, '').split('|')[0]
      const fields = selfChunk.split(',')
      expect(fields).toHaveLength(10)
      expect(fields[8]).toBe('') // hp=null
      expect(fields[9]).toBe('50')
    })

    it('hp=number && boost!=100 → 10 fields (両方あり)', () => {
      const target = CHARACTERS[0]
      const state = withUnit(INITIAL_BOARD_STATE, {
        characterId: target.id,
        cost: target.cost,
        hp: 300,
        boost: 75,
      })
      const payload = encodeV2(state)
      const selfChunk = payload.replace(/^u=/, '').split('|')[0]
      const fields = selfChunk.split(',')
      expect(fields).toHaveLength(10)
      expect(fields[8]).toBe('300')
      expect(fields[9]).toBe('75')
    })

    it('hp=0 (撃破) は "0" として encode され空文字にならない', () => {
      const target = CHARACTERS[0]
      const state = withUnit(INITIAL_BOARD_STATE, {
        characterId: target.id,
        cost: target.cost,
        hp: 0,
      })
      const payload = encodeV2(state)
      const fields = payload.replace(/^u=/, '').split('|')[0].split(',')
      expect(fields).toHaveLength(9)
      expect(fields[8]).toBe('0')
    })

    it('round-trip: encode → decode → encode が同じ文字列を返す (正規形が一意)', () => {
      const target = CHARACTERS[0]
      const state = withUnit(INITIAL_BOARD_STATE, {
        characterId: target.id,
        cost: target.cost,
        hp: 250,
        boost: 60,
      })
      const e1 = encode(state)
      const d = decode(e1)
      expect(d).not.toBeNull()
      const e2 = encode(d!)
      expect(e2).toBe(e1)
    })
  })

  describe('Issue #58: normalizeBoardState (decode 後の不整合補正)', () => {
    function makeState(self: Partial<Unit>): BoardState {
      return {
        ...INITIAL_BOARD_STATE,
        units: {
          ...INITIAL_BOARD_STATE.units,
          self: { ...INITIAL_BOARD_STATE.units.self, ...self },
        },
      }
    }

    it('characterId=null && hp=300 → hp=null に補正', () => {
      const dirty = makeState({ characterId: null, hp: 300 })
      const normalized = normalizeBoardState(dirty)
      expect(normalized.units.self.hp).toBeNull()
    })

    it('characterId=set && hp が maxHp を超える → maxHp に clamp', () => {
      const target = CHARACTERS[0]
      const dirty = makeState({
        characterId: target.id,
        cost: target.cost,
        hp: target.maxHp + 5000,
      })
      const normalized = normalizeBoardState(dirty)
      expect(normalized.units.self.hp).toBe(target.maxHp)
    })

    it('characterId=set && hp=null → maxHp に補完', () => {
      const target = CHARACTERS[0]
      const dirty = makeState({ characterId: target.id, cost: target.cost, hp: null })
      const normalized = normalizeBoardState(dirty)
      expect(normalized.units.self.hp).toBe(target.maxHp)
    })

    it('characterId=未知 ID → characterId=null + hp=null に補正', () => {
      const dirty = makeState({ characterId: 'totally-unknown', hp: 500 })
      const normalized = normalizeBoardState(dirty)
      expect(normalized.units.self.characterId).toBeNull()
      expect(normalized.units.self.hp).toBeNull()
    })

    it('boost が 0..100 範囲外 → clamp', () => {
      const high = makeState({ boost: 200 })
      expect(normalizeBoardState(high).units.self.boost).toBe(100)
      const low = makeState({ boost: -10 })
      expect(normalizeBoardState(low).units.self.boost).toBe(0)
    })

    it('boost が小数 → 整数化', () => {
      const frac = makeState({ boost: 33.4 })
      expect(normalizeBoardState(frac).units.self.boost).toBe(33)
    })

    it('既に整合した state は同じ参照を返す (React bailout)', () => {
      // INITIAL_BOARD_STATE は characterId=null && hp=null && boost=100 で正規形
      const same = normalizeBoardState(INITIAL_BOARD_STATE)
      expect(same).toBe(INITIAL_BOARD_STATE)
    })
  })

  describe('Issue #65: unknown characterCode warn dedup (DEV 環境)', () => {
    // DEV 環境限定の挙動 (vitest 実行時は import.meta.env.DEV === true)。
    // spy はこの describe に閉じ込め、既存テストの console.warn 出力には干渉しない
    // (Codex/Gemini セカンドオピニオン [共通] 反映: 新規 describe に限定、全体 spy は避ける)。
    let warnSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })
    afterEach(() => {
      warnSpy.mockRestore()
    })

    const fixed = '260,460,0,d,n,B,_'

    it('同じ未知 code が 4 ユニット全てに入った v2 URL の warn は 1 回に集約される', () => {
      // 同じ未知 code "ZZ" を 4 unit に入れる。Issue #65 前の挙動では 4 回 warn。
      const payload = `u=${fixed},ZZ|${fixed},ZZ|${fixed},ZZ|${fixed},ZZ`
      const state = decodeV2(payload)
      expect(state).not.toBeNull()
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(
        '[urlCodec] unknown characterCode: ZZ',
      )
    })

    it('異なる未知 code は code ごとに 1 回ずつ warn される', () => {
      // self/ally が "ZZ"、enemy1/enemy2 が "YY"。合計 2 回の warn を期待
      const payload = `u=${fixed},ZZ|${fixed},ZZ|${fixed},YY|${fixed},YY`
      const state = decodeV2(payload)
      expect(state).not.toBeNull()
      expect(warnSpy).toHaveBeenCalledTimes(2)
      expect(warnSpy).toHaveBeenCalledWith(
        '[urlCodec] unknown characterCode: ZZ',
      )
      expect(warnSpy).toHaveBeenCalledWith(
        '[urlCodec] unknown characterCode: YY',
      )
    })

    it('1 ユニットだけ未知 code の既存ケースは従来どおり 1 回 warn (regression 防止)', () => {
      const payload = `u=${fixed},ZZ|${fixed},|${fixed},|${fixed},`
      const state = decodeV2(payload)
      expect(state).not.toBeNull()
      expect(warnSpy).toHaveBeenCalledTimes(1)
    })

    it('同じ URL を連続 2 回 decode すると warn は 2 回出る (呼び出し境界でリセット)', () => {
      // 別 URL に切り替えたときの運用ミスを見逃さないため、Set は decode 呼び出し間で持ち越さない
      const payload = `u=${fixed},ZZ|${fixed},ZZ|${fixed},ZZ|${fixed},ZZ`
      decodeV2(payload)
      decodeV2(payload)
      expect(warnSpy).toHaveBeenCalledTimes(2)
    })
  })
})
