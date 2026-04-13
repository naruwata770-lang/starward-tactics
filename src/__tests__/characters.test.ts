/**
 * `src/data/characters.ts` のデータ整合性メタテスト。
 *
 * Issue #55 セカンドオピニオン共通[高] 反映:
 * `code` 永続性ルールはコメントだけでは破られうるので CI で固定する。
 *
 * - id 一意 / code 一意
 * - code 形式 (2 文字英数小文字、base64url-safe)
 * - lookup テーブル (CHARACTER_BY_ID / CHARACTER_BY_CODE) の完全性
 * - cost が型整合 (1.5 | 2 | 2.5 | 3)
 * - shortName / name が空でない
 *
 * 注: 「過去の code が消えていないか」の snapshot 固定はプロジェクト規模を見て
 * 別 PR で導入する。今回は重複と形式違反を CI で確実に弾くまでをスコープにする。
 */

import { describe, expect, it } from 'vitest'

import {
  CHARACTERS,
  CHARACTER_BY_CODE,
  CHARACTER_BY_ID,
  findCharacterByCode,
  findCharacterById,
} from '../data/characters'

describe('characters data integrity', () => {
  it('id is unique across all characters', () => {
    const ids = CHARACTERS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('code is unique across all characters', () => {
    const codes = CHARACTERS.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('every code matches the URL-safe format (lowercase alnum, length 2)', () => {
    for (const char of CHARACTERS) {
      expect(char.code).toMatch(/^[a-z0-9]{2}$/)
    }
  })

  it('every cost is one of the allowed Cost values', () => {
    const allowed = new Set([1.5, 2, 2.5, 3])
    for (const char of CHARACTERS) {
      expect(allowed.has(char.cost)).toBe(true)
    }
  })

  it('name and shortName are non-empty', () => {
    for (const char of CHARACTERS) {
      expect(char.name.length).toBeGreaterThan(0)
      expect(char.shortName.length).toBeGreaterThan(0)
    }
  })

  it('CHARACTER_BY_ID covers every entry exactly once', () => {
    expect(Object.keys(CHARACTER_BY_ID).length).toBe(CHARACTERS.length)
    for (const char of CHARACTERS) {
      expect(CHARACTER_BY_ID[char.id]).toBe(char)
    }
  })

  it('CHARACTER_BY_CODE covers every entry exactly once', () => {
    expect(Object.keys(CHARACTER_BY_CODE).length).toBe(CHARACTERS.length)
    for (const char of CHARACTERS) {
      expect(CHARACTER_BY_CODE[char.code]).toBe(char)
    }
  })

  it('findCharacterById returns null for null / unknown', () => {
    expect(findCharacterById(null)).toBeNull()
    expect(findCharacterById('definitely-not-a-real-id')).toBeNull()
  })

  it('findCharacterById returns the right entry for known id', () => {
    const sample = CHARACTERS[0]
    expect(findCharacterById(sample.id)).toBe(sample)
  })

  it('findCharacterByCode returns null for empty / unknown code', () => {
    expect(findCharacterByCode('')).toBeNull()
    expect(findCharacterByCode('zz')).toBeNull()
  })

  it('findCharacterByCode returns the right entry for known code', () => {
    const sample = CHARACTERS[0]
    expect(findCharacterByCode(sample.code)).toBe(sample)
  })

  // ---- Issue #71: atwiki 実測値に置換した後の sanity check ----
  //
  // あえて「cost 内で maxHp が一致」「単調増加」等の assertion は入れない。
  // 星の翼 は同 cost 内でも HP が機体別 (atwiki 体力一覧) なので、そうした
  // assertion は Spec を仕様化して Evidence を無視する逆転を起こす。
  // ここでは「今回の変更意図 (placeholder 排除) が守られている」「未来に桁ミス
  // 等の jarring な regression が入ったら CI が気付く」に絞る。

  it('no maxHp uses the old EXVS placeholder values (680 / 620 / 560 / 480)', () => {
    // Issue #58 時代の暫定値。Issue #71 で個別実測値 / 新 fallback に置換済み
    const OLD_PLACEHOLDER_VALUES = new Set([680, 620, 560, 480])
    for (const char of CHARACTERS) {
      expect(
        OLD_PLACEHOLDER_VALUES.has(char.maxHp),
        `${char.id} still uses placeholder maxHp=${char.maxHp}`,
      ).toBe(false)
    }
  })

  it('every maxHp is a positive integer', () => {
    for (const char of CHARACTERS) {
      expect(Number.isInteger(char.maxHp)).toBe(true)
      expect(char.maxHp).toBeGreaterThan(0)
    }
  })

  it('every maxHp is within the 星の翼 実測レンジ (1800..3100)', () => {
    // 下限 1800 = 実測 min 1872 (snow-wall) の -3.8% 余裕。
    // 上限 3100 = 実測 max 3020 (griffin) の +2.6% 余裕。
    // 桁違い (68, 29000 等) や旧 EXVS placeholder (480/560/620/680) を弾くための
    // 粗い範囲 check。cost 別 narrow 化は手入力ミス検出力は上がるが、将来の
    // 調整パッチで壊れるリスク (Spec vs Evidence 逆転) の方が大きいので採らない。
    for (const char of CHARACTERS) {
      expect(
        char.maxHp,
        `${char.id} maxHp=${char.maxHp} is out of the expected range`,
      ).toBeGreaterThanOrEqual(1800)
      expect(char.maxHp).toBeLessThanOrEqual(3100)
    }
  })
})
