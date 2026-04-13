/**
 * EXVS2 系の機体カタログ。Issue #55 で導入。
 *
 * ============================================================
 *  ⚠️ code 永続性ルール (これを破ると過去の共有 URL が壊れる)
 * ============================================================
 *
 * `code` は URL に乗る短縮識別子 (2 文字)。一度公開した値は **不変**:
 *
 *   1. 既存 `code` の rename / reorder 禁止
 *   2. 新機体追加 → 必ず新しい `code` を末尾に割り当てる
 *   3. 機体削除 → `code` は欠番扱い、再利用禁止
 *   4. `code` の文字種は base64url-safe な英小文字 + 数字に限定 (`a-z0-9`)
 *      理由: URL 安全 & 大文字小文字の取り違え事故を防ぐ
 *
 * 違反検出は `src/__tests__/characters.test.ts` の data-driven test で CI が落ちる:
 * - id 一意 / code 一意 / code 形式 (2 文字英数小文字) / lookup 完全性
 *
 * ============================================================
 *  shortName ガイドライン
 * ============================================================
 *
 * shortName は盤面トークン上に描画される (UnitToken.tsx)。
 * - 4-5 文字程度を目安に。半角英数なら 6 文字まで OK
 * - 全角は 4 文字以内推奨 (現行 UNIT_LABEL_WIDTH=64px / fontSize=12 で収まる範囲)
 *
 * ============================================================
 *  searchTokens
 * ============================================================
 *
 * 検索フィルタが `name + searchTokens` を部分一致で見るので、
 * 別名 / 作品略称 / 読み仮名 / アルファベット表記 などを入れる。
 */

import type { Cost } from '../types/board'

export interface Character {
  id: string
  name: string
  shortName: string
  cost: Cost
  code: string
  searchTokens: readonly string[]
}

/**
 * 機体マスタ (順序は表示順だが、code が一意なら順序は無関係)。
 *
 * 初期投入は EXVS2 系の代表機体を中心に最小セット。後続 PR で増やす想定。
 */
export const CHARACTERS: readonly Character[] = [
  // ---- cost 3.0 ----
  {
    id: 'nu-gundam',
    name: 'νガンダム',
    shortName: 'ν',
    cost: 3,
    code: '01',
    searchTokens: ['nu', 'にゅー', 'amuro', 'ニュー', 'CCA'],
  },
  {
    id: 'sazabi',
    name: 'サザビー',
    shortName: 'サザビ',
    cost: 3,
    code: '02',
    searchTokens: ['sazabi', 'char', 'シャア', 'CCA'],
  },
  {
    id: 'wing-zero',
    name: 'ウイングゼロ',
    shortName: 'WZ',
    cost: 3,
    code: '03',
    searchTokens: ['wing', 'zero', 'heero', 'EW', 'ウイング'],
  },
  {
    id: 'master-gundam',
    name: 'マスターガンダム',
    shortName: 'マスタ',
    cost: 3,
    code: '04',
    searchTokens: ['master', 'GF', 'Gガン', 'タオル'],
  },
  {
    id: 'turn-a',
    name: '∀ガンダム',
    shortName: '∀',
    cost: 3,
    code: '05',
    searchTokens: ['turn-a', 'ターンエー', 'loran', 'TURN A'],
  },
  {
    id: 'qant',
    name: 'ガンダムクアンタ',
    shortName: 'クアン',
    cost: 3,
    code: '06',
    searchTokens: ['qant', 'quanta', '00', 'setsuna'],
  },
  {
    id: 'barbatos-lupus-rex',
    name: 'バルバトスルプスレクス',
    shortName: 'BLR',
    cost: 3,
    code: '07',
    searchTokens: ['barbatos', 'lupus', 'rex', 'IBO', '鉄血'],
  },

  // ---- cost 2.5 ----
  {
    id: 'gundam-mk2-aeug',
    name: 'ガンダムMk-II (AEUG)',
    shortName: 'Mk2A',
    cost: 2.5,
    code: '11',
    searchTokens: ['mk2', 'mk-ii', 'aeug', 'kamille', 'カミーユ'],
  },
  {
    id: 'qubeley',
    name: 'キュベレイ',
    shortName: 'キュベ',
    cost: 2.5,
    code: '12',
    searchTokens: ['qubeley', 'haman', 'ハマーン', 'ZZ'],
  },
  {
    id: 'deathscythe-hell',
    name: 'デスサイズヘル',
    shortName: 'DSH',
    cost: 2.5,
    code: '13',
    searchTokens: ['deathscythe', 'hell', 'duo', 'EW'],
  },
  {
    id: 'god-gundam',
    name: 'ゴッドガンダム',
    shortName: 'ゴッド',
    cost: 2.5,
    code: '14',
    searchTokens: ['god', 'burning', 'domon', 'ドモン', 'Gガン'],
  },
  {
    id: 'exia',
    name: 'ガンダムエクシア',
    shortName: 'エクシ',
    cost: 2.5,
    code: '15',
    searchTokens: ['exia', '00', 'setsuna', 'セツナ'],
  },

  // ---- cost 2.0 ----
  {
    id: 'rx78-2',
    name: 'ガンダム',
    shortName: 'RX78',
    cost: 2,
    code: '21',
    searchTokens: ['rx-78', 'amuro', 'アムロ', '初代', 'first'],
  },
  {
    id: 'gundam-mk2-titans',
    name: 'ガンダムMk-II (TITANS)',
    shortName: 'Mk2T',
    cost: 2,
    code: '22',
    searchTokens: ['mk2', 'mk-ii', 'titans', 'jerid', 'ジェリド'],
  },
  {
    id: 'tallgeese',
    name: 'トールギス',
    shortName: 'TG',
    cost: 2,
    code: '23',
    searchTokens: ['tallgeese', 'zechs', 'ゼクス', 'EW'],
  },
  {
    id: 'gp02a',
    name: 'ガンダム試作2号機',
    shortName: 'GP02',
    cost: 2,
    code: '24',
    searchTokens: ['gp02', 'physalis', '0083', 'gato', 'ガトー'],
  },

  // ---- cost 1.5 ----
  {
    id: 'gm-sniper-2',
    name: 'ジムスナイパーII',
    shortName: 'GMS2',
    cost: 1.5,
    code: '31',
    searchTokens: ['gm', 'sniper', 'jim', '0080', 'シロー'],
  },
  {
    id: 'leo',
    name: 'リーオー',
    shortName: 'リーオ',
    cost: 1.5,
    code: '32',
    searchTokens: ['leo', 'EW', 'リーオー'],
  },
  {
    id: 'ball',
    name: 'ボール',
    shortName: 'ボール',
    cost: 1.5,
    code: '33',
    searchTokens: ['ball', 'rb-79', '初代'],
  },
] as const

/**
 * code → Character の lookup テーブル。
 * URL decode で頻繁に引くので Map ではなく Record で持つ (literal access が高速)。
 */
export const CHARACTER_BY_CODE: Readonly<Record<string, Character>> =
  Object.freeze(
    CHARACTERS.reduce<Record<string, Character>>((acc, char) => {
      acc[char.code] = char
      return acc
    }, {}),
  )

/**
 * id → Character の lookup テーブル。InspectorPanel / UnitToken / reducer で使う。
 */
export const CHARACTER_BY_ID: Readonly<Record<string, Character>> =
  Object.freeze(
    CHARACTERS.reduce<Record<string, Character>>((acc, char) => {
      acc[char.id] = char
      return acc
    }, {}),
  )

/**
 * id を渡すと Character または undefined を返す。
 * decode 経路でも UI 経路でも、未知 id は undefined → 呼び側で characterId=null fallback。
 */
export function findCharacterById(id: string | null): Character | null {
  if (id === null) return null
  return CHARACTER_BY_ID[id] ?? null
}

/**
 * code を渡すと Character または null を返す。decode 用。
 */
export function findCharacterByCode(code: string): Character | null {
  if (code === '') return null
  return CHARACTER_BY_CODE[code] ?? null
}
