/**
 * 星の翼 (Starward Tactics / 中国版「星之翼」) の機体カタログ。Issue #55 で導入。
 *
 * データソース:
 * - キャラ一覧: https://wikiwiki.jp/kazenopantsu/ (ファンメイド wiki)
 * - 公式勝率リスト: https://xzyjp.shengtiangames.com/gamerecords/dist/index.html
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
 * 検索フィルタが `name + shortName + searchTokens` を部分一致で見るので、
 * 別名 / 読み仮名 / アルファベット表記 などを入れる。空配列でも OK。
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
 * カゼのパンツ wiki 掲載のコスト分類に基づく:
 *   30 コスト → cost: 3
 *   25 コスト → cost: 2.5
 *   20 コスト → cost: 2
 *   15 コスト → cost: 1.5
 */
export const CHARACTERS: readonly Character[] = [
  // ---- cost 3 (30コスト) ----
  { id: 'kerubim', name: 'ケルビム', shortName: 'ケルビ', cost: 3, code: '01', searchTokens: ['kerubim'] },
  { id: 'hikari', name: 'ヒカリ', shortName: 'ヒカリ', cost: 3, code: '02', searchTokens: ['hikari'] },
  { id: 'shuwu', name: 'シュウウ', shortName: 'シュウ', cost: 3, code: '03', searchTokens: ['shuwu'] },
  { id: 'elfin', name: 'エルフィン', shortName: 'エルフ', cost: 3, code: '04', searchTokens: ['elfin'] },
  { id: 'raziel', name: 'ラジエル', shortName: 'ラジエ', cost: 3, code: '05', searchTokens: ['raziel'] },
  { id: 'griffin', name: 'グリフィン', shortName: 'グリフ', cost: 3, code: '06', searchTokens: ['griffin'] },
  { id: 'suzuran', name: 'スズラン', shortName: 'スズラ', cost: 3, code: '07', searchTokens: ['suzuran'] },
  { id: 'cavalry', name: 'キャヴァリー', shortName: 'キャヴ', cost: 3, code: '08', searchTokens: ['cavalry'] },
  { id: 'kage', name: '影', shortName: '影', cost: 3, code: '09', searchTokens: ['kage', 'shadow'] },
  { id: 'line', name: 'ライン', shortName: 'ライン', cost: 3, code: '10', searchTokens: ['line'] },
  { id: 'rota', name: 'ロタ', shortName: 'ロタ', cost: 3, code: '11', searchTokens: ['rota'] },
  { id: 'eser', name: 'イーザー', shortName: 'イーザ', cost: 3, code: '12', searchTokens: ['eser'] },
  { id: 'akigumo', name: '秋雲', shortName: '秋雲', cost: 3, code: '13', searchTokens: ['akigumo'] },
  { id: 'longinus-beta', name: 'ロンギヌス-ベータ', shortName: 'ロンギ', cost: 3, code: '14', searchTokens: ['longinus', 'beta'] },
  { id: 'cammy', name: 'キャミィ', shortName: 'キャミ', cost: 3, code: '15', searchTokens: ['cammy'] },
  { id: 'seiren', name: 'セイレン', shortName: 'セイレ', cost: 3, code: '16', searchTokens: ['seiren', 'siren'] },
  { id: 'mumei', name: '無銘', shortName: '無銘', cost: 3, code: '17', searchTokens: ['mumei'] },
  { id: 'akatsuki', name: 'アカツキ', shortName: 'アカツ', cost: 3, code: '18', searchTokens: ['akatsuki'] },

  // ---- cost 2.5 (25コスト) ----
  { id: 'fried', name: 'フリード', shortName: 'フリー', cost: 2.5, code: '19', searchTokens: ['fried'] },
  { id: 'kaze', name: 'カゼ', shortName: 'カゼ', cost: 2.5, code: '20', searchTokens: ['kaze'] },
  { id: 'shaolin', name: 'シャオリン', shortName: 'シャオ', cost: 2.5, code: '21', searchTokens: ['shaolin'] },
  { id: 'sharp', name: 'シャープ', shortName: 'シャー', cost: 2.5, code: '22', searchTokens: ['sharp'] },
  { id: '18-go', name: '18号', shortName: '18号', cost: 2.5, code: '23', searchTokens: ['18', 'jyuhachi'] },
  { id: 'alice', name: 'アリス', shortName: 'アリス', cost: 2.5, code: '24', searchTokens: ['alice'] },
  { id: 'sky-saver', name: 'スカイセーバー', shortName: 'スカイ', cost: 2.5, code: '25', searchTokens: ['sky', 'saver'] },
  { id: 'cygnus', name: 'シグナス', shortName: 'シグナ', cost: 2.5, code: '26', searchTokens: ['cygnus'] },
  { id: 'angelis', name: 'アンジェリス', shortName: 'アンジ', cost: 2.5, code: '27', searchTokens: ['angelis'] },
  { id: 'valkia', name: 'ヴァルキア', shortName: 'ヴァル', cost: 2.5, code: '28', searchTokens: ['valkia'] },
  { id: 'eva', name: 'エヴァ', shortName: 'エヴァ', cost: 2.5, code: '29', searchTokens: ['eva'] },
  { id: 'gourai-kai', name: '轟雷改', shortName: '轟雷改', cost: 2.5, code: '30', searchTokens: ['gourai', 'kai'] },
  { id: 'ine', name: '稲', shortName: '稲', cost: 2.5, code: '31', searchTokens: ['ine'] },
  { id: 'baselard', name: 'バーゼラルド', shortName: 'バーゼ', cost: 2.5, code: '32', searchTokens: ['baselard'] },
  { id: 'nora', name: 'ノーラ', shortName: 'ノーラ', cost: 2.5, code: '33', searchTokens: ['nora'] },
  { id: 'lancelot', name: 'ランスロット', shortName: 'ランス', cost: 2.5, code: '34', searchTokens: ['lancelot'] },
  { id: 'thunderbolt-otome', name: 'サンダーボルト-OTOME', shortName: 'OTOME', cost: 2.5, code: '35', searchTokens: ['thunderbolt', 'otome'] },
  { id: 'galahad-akatsuki', name: 'ガラハッド・暁', shortName: 'ガラ暁', cost: 2.5, code: '36', searchTokens: ['galahad', 'akatsuki'] },
  { id: 'dead-alive', name: 'デッド・アライブ', shortName: 'D&A', cost: 2.5, code: '37', searchTokens: ['dead', 'alive'] },
  { id: 'haruka', name: 'ハルカ', shortName: 'ハルカ', cost: 2.5, code: '38', searchTokens: ['haruka'] },
  { id: 'dragoner', name: 'ドラグナー', shortName: 'ドラグ', cost: 2.5, code: '39', searchTokens: ['dragoner'] },
  { id: 'reki', name: 'レキ', shortName: 'レキ', cost: 2.5, code: '40', searchTokens: ['reki'] },

  // ---- cost 2 (20コスト) ----
  { id: 'beta', name: 'ベータ', shortName: 'ベータ', cost: 2, code: '41', searchTokens: ['beta'] },
  { id: 'deucalion', name: 'デュカリオン', shortName: 'デュカ', cost: 2, code: '42', searchTokens: ['deucalion'] },
  { id: 'seraphim', name: 'セラフィム', shortName: 'セラフ', cost: 2, code: '43', searchTokens: ['seraphim'] },
  { id: 'aida', name: 'アイーダ', shortName: 'アイー', cost: 2, code: '44', searchTokens: ['aida'] },
  { id: 'pallas', name: 'パラス', shortName: 'パラス', cost: 2, code: '45', searchTokens: ['pallas'] },
  { id: 'scorpion', name: 'スコーピオン', shortName: 'スコピ', cost: 2, code: '46', searchTokens: ['scorpion'] },
  { id: 'zaharowa', name: 'ザハロワ', shortName: 'ザハロ', cost: 2, code: '47', searchTokens: ['zaharowa'] },
  { id: 'virtue', name: 'ヴァーチェ', shortName: 'ヴァチ', cost: 2, code: '48', searchTokens: ['virtue'] },
  { id: 'sakuya', name: '咲迦', shortName: '咲迦', cost: 2, code: '49', searchTokens: ['sakuya'] },
  { id: 'chinni', name: 'チンニ', shortName: 'チンニ', cost: 2, code: '50', searchTokens: ['chinni'] },
  { id: 'darkstar', name: 'ダークスター', shortName: 'ダーク', cost: 2, code: '51', searchTokens: ['darkstar'] },
  { id: 'hibiki', name: 'ヒビキ', shortName: 'ヒビキ', cost: 2, code: '52', searchTokens: ['hibiki'] },
  { id: 'stylet', name: 'スティレット', shortName: 'スティ', cost: 2, code: '53', searchTokens: ['stylet'] },
  { id: 'borzoi', name: 'ボルゾイ', shortName: 'ボルゾ', cost: 2, code: '54', searchTokens: ['borzoi'] },
  { id: 'catty', name: 'キャッティ', shortName: 'キャッ', cost: 2, code: '55', searchTokens: ['catty'] },
  { id: 'breaker', name: 'ブリーカー', shortName: 'ブリー', cost: 2, code: '56', searchTokens: ['breaker'] },
  { id: 'galahad', name: 'ガラハッド', shortName: 'ガラハ', cost: 2, code: '57', searchTokens: ['galahad'] },
  { id: 'flanker', name: 'フランカー', shortName: 'フラン', cost: 2, code: '58', searchTokens: ['flanker'] },
  { id: 'aislin', name: 'アイスリン', shortName: 'アイス', cost: 2, code: '59', searchTokens: ['aislin'] },
  { id: 'krista', name: 'クリスタ', shortName: 'クリス', cost: 2, code: '60', searchTokens: ['krista', 'crista'] },
  { id: 'tatiana', name: 'タチアナ', shortName: 'タチア', cost: 2, code: '61', searchTokens: ['tatiana'] },
  { id: 'phoebe', name: 'フィービー', shortName: 'フィビ', cost: 2, code: '62', searchTokens: ['phoebe'] },

  // ---- cost 1.5 (15コスト) ----
  { id: 'orchid', name: 'オーキッド', shortName: 'オーキ', cost: 1.5, code: '63', searchTokens: ['orchid'] },
  { id: 'roland', name: 'ローランド', shortName: 'ローラ', cost: 1.5, code: '64', searchTokens: ['roland'] },
  { id: 'catalina', name: 'カタリナ', shortName: 'カタリ', cost: 1.5, code: '65', searchTokens: ['catalina'] },
  { id: 'snow-wall', name: 'スノーウォル', shortName: 'スノー', cost: 1.5, code: '66', searchTokens: ['snow', 'wall'] },
  { id: 'yamin', name: 'ヤミン', shortName: 'ヤミン', cost: 1.5, code: '67', searchTokens: ['yamin'] },
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
 * id を渡すと Character または null を返す。
 * decode 経路でも UI 経路でも、未知 id は null → 呼び側で characterId=null fallback。
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
