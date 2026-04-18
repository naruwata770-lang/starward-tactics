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
 *
 * ============================================================
 *  maxHp (Issue #71 で atwiki 実測値へ置換)
 * ============================================================
 *
 * 各機体の最大 HP 値。盤面トークンに「残 HP / 最大 HP」を表示する用途で使う。
 *
 * データソース:
 *   - 体力一覧 (50 機): `https://w.atwiki.jp/starward/pages/67.html` の
 *     「体力一覧」セクション。2025-08-01 時点のスナップショット
 *   - 個別ページ (17 機): 体力一覧 未掲載機は各機体の atwiki 個別ページの
 *     ステータス欄 (例: キャミィ `pages/334.html` の「体力：3000」) から採用。
 *     2026-04-13 取得
 *
 * 結果として全 67 機すべてが atwiki 実測値。fallback 機構 (cost 別代表値) は
 * dead code 化するため削除済み。将来新機体を追加する場合、`Character.maxHp`
 * は必須フィールドなので型チェックで記入漏れが必ず弾かれる。
 *
 * URL 互換性 (Issue #71 PR で明記):
 * maxHp は URL に乗らない (urlCodec は characterCode + hp のみ encode) ので、
 * maxHp 差し替えで URL スキーマは変わらない。ただし旧 placeholder 時代の
 * 共有 URL (hp=680 等) を読み込むと、新 maxHp (例 2953) 下では「低残量」に
 * 見える。normalizeBoardState が 0..maxHp で clamp するので破綻はしない。
 */

import type { Cost } from '../types/board'

export interface Character {
  id: string
  name: string
  shortName: string
  cost: Cost
  /** URL に乗る 2 文字短縮識別子 (永続。変更厳禁) */
  code: string
  /** 最大 HP (全機体 atwiki 実測値。詳細は冒頭コメントの maxHp 節を参照) */
  maxHp: number
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
 *
 * 編集規約: 全 7 フィールド (`id, name, shortName, cost, code, searchTokens, maxHp`)
 * を必ず埋める。`maxHp` の出典は冒頭コメントの maxHp 節を参照。
 */
export const CHARACTERS: readonly Character[] = [
  // ---- cost 3 (30コスト) ----
  { id: 'kerubim', name: 'ケルビム', shortName: 'ケルビ', cost: 3, code: '01', searchTokens: ['kerubim'], maxHp: 2953 },
  { id: 'hikari', name: 'ヒカリ', shortName: 'ヒカリ', cost: 3, code: '02', searchTokens: ['hikari'], maxHp: 2886 },
  { id: 'shuwu', name: 'シュウウ', shortName: 'シュウ', cost: 3, code: '03', searchTokens: ['shuwu'], maxHp: 2886 },
  { id: 'elfin', name: 'エルフィン', shortName: 'エルフ', cost: 3, code: '04', searchTokens: ['elfin'], maxHp: 2808 },
  { id: 'raziel', name: 'ラジエル', shortName: 'ラジエ', cost: 3, code: '05', searchTokens: ['raziel'], maxHp: 2953 },
  { id: 'griffin', name: 'グリフィン', shortName: 'グリフ', cost: 3, code: '06', searchTokens: ['griffin'], maxHp: 3020 },
  { id: 'suzuran', name: 'スズラン', shortName: 'スズラ', cost: 3, code: '07', searchTokens: ['suzuran'], maxHp: 2723 },
  { id: 'cavalry', name: 'キャヴァリー', shortName: 'キャヴ', cost: 3, code: '08', searchTokens: ['cavalry'], maxHp: 3003 },
  { id: 'kage', name: '影', shortName: '影', cost: 3, code: '09', searchTokens: ['kage', 'shadow'], maxHp: 2909 },
  { id: 'line', name: 'ライン', shortName: 'ライン', cost: 3, code: '10', searchTokens: ['line'], maxHp: 2850 },
  { id: 'rota', name: 'ロタ', shortName: 'ロタ', cost: 3, code: '11', searchTokens: ['rota'], maxHp: 2892 },
  { id: 'eser', name: 'イーザー', shortName: 'イーザ', cost: 3, code: '12', searchTokens: ['eser'], maxHp: 2886 },
  { id: 'akigumo', name: '秋雲', shortName: '秋雲', cost: 3, code: '13', searchTokens: ['akigumo'], maxHp: 2886 },
  { id: 'longinus-beta', name: 'ロンギヌス-ベータ', shortName: 'ロンギ', cost: 3, code: '14', searchTokens: ['longinus', 'beta'], maxHp: 2888 },
  { id: 'cammy', name: 'キャミィ', shortName: 'キャミ', cost: 3, code: '15', searchTokens: ['cammy'], maxHp: 3000 },
  { id: 'seiren', name: 'セイレン', shortName: 'セイレ', cost: 3, code: '16', searchTokens: ['seiren', 'siren'], maxHp: 2895 },
  { id: 'mumei', name: '無銘', shortName: '無銘', cost: 3, code: '17', searchTokens: ['mumei'], maxHp: 2800 },
  { id: 'akatsuki', name: 'アカツキ', shortName: 'アカツ', cost: 3, code: '18', searchTokens: ['akatsuki'], maxHp: 2950 },

  // ---- cost 2.5 (25コスト) ----
  { id: 'fried', name: 'フリード', shortName: 'フリー', cost: 2.5, code: '19', searchTokens: ['fried'], maxHp: 2664 },
  { id: 'kaze', name: 'カゼ', shortName: 'カゼ', cost: 2.5, code: '20', searchTokens: ['kaze'], maxHp: 2592 },
  { id: 'shaolin', name: 'シャオリン', shortName: 'シャオ', cost: 2.5, code: '21', searchTokens: ['shaolin'], maxHp: 2772 },
  { id: 'sharp', name: 'シャープ', shortName: 'シャー', cost: 2.5, code: '22', searchTokens: ['sharp'], maxHp: 2592 },
  { id: '18-go', name: '18号', shortName: '18号', cost: 2.5, code: '23', searchTokens: ['18', 'jyuhachi'], maxHp: 2664 },
  { id: 'alice', name: 'アリス', shortName: 'アリス', cost: 2.5, code: '24', searchTokens: ['alice'], maxHp: 2772 },
  { id: 'sky-saver', name: 'スカイセーバー', shortName: 'スカイ', cost: 2.5, code: '25', searchTokens: ['sky', 'saver'], maxHp: 2664 },
  { id: 'cygnus', name: 'シグナス', shortName: 'シグナ', cost: 2.5, code: '26', searchTokens: ['cygnus'], maxHp: 2492 },
  { id: 'angelis', name: 'アンジェリス', shortName: 'アンジ', cost: 2.5, code: '27', searchTokens: ['angelis'], maxHp: 2500 },
  { id: 'valkia', name: 'ヴァルキア', shortName: 'ヴァル', cost: 2.5, code: '28', searchTokens: ['valkia'], maxHp: 2592 },
  { id: 'eva', name: 'エヴァ', shortName: 'エヴァ', cost: 2.5, code: '29', searchTokens: ['eva'], maxHp: 2550 },
  { id: 'gourai-kai', name: '轟雷改', shortName: '轟雷改', cost: 2.5, code: '30', searchTokens: ['gourai', 'kai'], maxHp: 2669 },
  { id: 'ine', name: '稲', shortName: '稲', cost: 2.5, code: '31', searchTokens: ['ine'], maxHp: 2556 },
  { id: 'baselard', name: 'バーゼラルド', shortName: 'バーゼ', cost: 2.5, code: '32', searchTokens: ['baselard'], maxHp: 2556 },
  { id: 'nora', name: 'ノーラ', shortName: 'ノーラ', cost: 2.5, code: '33', searchTokens: ['nora'], maxHp: 2772 },
  { id: 'lancelot', name: 'ランスロット', shortName: 'ランス', cost: 2.5, code: '34', searchTokens: ['lancelot'], maxHp: 2655 },
  { id: 'thunderbolt-otome', name: 'サンダーボルト-OTOME', shortName: 'OTOME', cost: 2.5, code: '35', searchTokens: ['thunderbolt', 'otome'], maxHp: 2500 },
  { id: 'galahad-akatsuki', name: 'ガラハッド・暁', shortName: 'ガラ暁', cost: 2.5, code: '36', searchTokens: ['galahad', 'akatsuki'], maxHp: 2655 },
  { id: 'dead-alive', name: 'デッド・アライブ', shortName: 'D&A', cost: 2.5, code: '37', searchTokens: ['dead', 'alive'], maxHp: 2525 },
  { id: 'haruka', name: 'ハルカ', shortName: 'ハルカ', cost: 2.5, code: '38', searchTokens: ['haruka'], maxHp: 2650 },
  { id: 'dragoner', name: 'ドラグナー', shortName: 'ドラグ', cost: 2.5, code: '39', searchTokens: ['dragoner'], maxHp: 2500 },
  { id: 'reki', name: 'レキ', shortName: 'レキ', cost: 2.5, code: '40', searchTokens: ['reki'], maxHp: 2710 },
  { id: 'black-rock-shooter', name: 'ブラック★ロックシューター', shortName: 'BRS', cost: 2.5, code: '68', searchTokens: ['black', 'rock', 'shooter', 'brs'], maxHp: 2588 },

  // ---- cost 2 (20コスト) ----
  { id: 'beta', name: 'ベータ', shortName: 'ベータ', cost: 2, code: '41', searchTokens: ['beta'], maxHp: 2340 },
  { id: 'deucalion', name: 'デュカリオン', shortName: 'デュカ', cost: 2, code: '42', searchTokens: ['deucalion'], maxHp: 2168 },
  { id: 'seraphim', name: 'セラフィム', shortName: 'セラフ', cost: 2, code: '43', searchTokens: ['seraphim'], maxHp: 2340 },
  { id: 'aida', name: 'アイーダ', shortName: 'アイー', cost: 2, code: '44', searchTokens: ['aida'], maxHp: 2240 },
  { id: 'pallas', name: 'パラス', shortName: 'パラス', cost: 2, code: '45', searchTokens: ['pallas'], maxHp: 2448 },
  { id: 'scorpion', name: 'スコーピオン', shortName: 'スコピ', cost: 2, code: '46', searchTokens: ['scorpion'], maxHp: 2268 },
  { id: 'zaharowa', name: 'ザハロワ', shortName: 'ザハロ', cost: 2, code: '47', searchTokens: ['zaharowa'], maxHp: 2196 },
  { id: 'virtue', name: 'ヴァーチェ', shortName: 'ヴァチ', cost: 2, code: '48', searchTokens: ['virtue'], maxHp: 2348 },
  { id: 'sakuya', name: '咲迦', shortName: '咲迦', cost: 2, code: '49', searchTokens: ['sakuya'], maxHp: 2298 },
  { id: 'chinni', name: 'チンニ', shortName: 'チンニ', cost: 2, code: '50', searchTokens: ['chinni'], maxHp: 2268 },
  { id: 'darkstar', name: 'ダークスター', shortName: 'ダーク', cost: 2, code: '51', searchTokens: ['darkstar'], maxHp: 2155 },
  { id: 'hibiki', name: 'ヒビキ', shortName: 'ヒビキ', cost: 2, code: '52', searchTokens: ['hibiki'], maxHp: 2168 },
  { id: 'stylet', name: 'スティレット', shortName: 'スティ', cost: 2, code: '53', searchTokens: ['stylet'], maxHp: 2340 },
  { id: 'borzoi', name: 'ボルゾイ', shortName: 'ボルゾ', cost: 2, code: '54', searchTokens: ['borzoi'], maxHp: 2210 },
  { id: 'catty', name: 'キャッティ', shortName: 'キャッ', cost: 2, code: '55', searchTokens: ['catty'], maxHp: 2240 },
  { id: 'breaker', name: 'ブリーカー', shortName: 'ブリー', cost: 2, code: '56', searchTokens: ['breaker'], maxHp: 2340 },
  { id: 'galahad', name: 'ガラハッド', shortName: 'ガラハ', cost: 2, code: '57', searchTokens: ['galahad'], maxHp: 2340 },
  { id: 'flanker', name: 'フランカー', shortName: 'フラン', cost: 2, code: '58', searchTokens: ['flanker'], maxHp: 2222 },
  { id: 'aislin', name: 'アイスリン', shortName: 'アイス', cost: 2, code: '59', searchTokens: ['aislin'], maxHp: 2200 },
  { id: 'krista', name: 'クリスタ', shortName: 'クリス', cost: 2, code: '60', searchTokens: ['krista', 'crista'], maxHp: 2240 },
  { id: 'tatiana', name: 'タチアナ', shortName: 'タチア', cost: 2, code: '61', searchTokens: ['tatiana'], maxHp: 2400 },
  { id: 'phoebe', name: 'フィービー', shortName: 'フィビ', cost: 2, code: '62', searchTokens: ['phoebe'], maxHp: 2155 },

  // ---- cost 1.5 (15コスト) ----
  { id: 'orchid', name: 'オーキッド', shortName: 'オーキ', cost: 1.5, code: '63', searchTokens: ['orchid'], maxHp: 1980 },
  { id: 'roland', name: 'ローランド', shortName: 'ローラ', cost: 1.5, code: '64', searchTokens: ['roland'], maxHp: 2088 },
  { id: 'catalina', name: 'カタリナ', shortName: 'カタリ', cost: 1.5, code: '65', searchTokens: ['catalina'], maxHp: 2080 },
  { id: 'snow-wall', name: 'スノーウォル', shortName: 'スノー', cost: 1.5, code: '66', searchTokens: ['snow', 'wall'], maxHp: 1872 },
  { id: 'yamin', name: 'ヤミン', shortName: 'ヤミン', cost: 1.5, code: '67', searchTokens: ['yamin'], maxHp: 1980 },
] as const

/**
 * 検索クエリ正規化。
 *
 * 現状は `trim().toLowerCase()` のみ。将来 NFKC / ひらがな↔カタカナ / 長音同一視を
 * 入れるときは、この関数の中身だけを差し替えれば haystack 側 (module top-level で
 * 1 回計算) と query 側 (keystroke ごと) が同時に更新される。
 *
 * module top-level で呼んでから、Issue #66 の `SEARCHABLE_CHARACTERS` 構築 1 回と
 * 検索側の queryLower 生成 1 回ずつに使う。
 */
export function normalizeSearchText(input: string): string {
  return input.trim().toLowerCase()
}

/**
 * 検索インデックス要素。検索専用の派生ビューなので `Character` 本体には
 * `searchHaystack` フィールドを生やさず、ここで 1 本 `haystack` を持つ形に分離している
 * (Issue #66 セカンドオピニオン Codex[高] 反映。ドメイン型と UI 都合の責務分離)。
 */
export interface SearchableCharacter {
  readonly char: Character
  /** normalizeSearchText 済み `${name} ${shortName} ${searchTokens.join(' ')}` */
  readonly haystack: string
}

/**
 * module top-level で 1 回だけ haystack を生成する検索ビュー。
 *
 * これにより CharacterSelector のキーストロークごとに全機体分 `toLowerCase` を
 * 再計算する必要が無くなる (N × tokens 回 → 0 回)。機体数が 68 から 200+ に
 * 増えた将来でも、keystroke 側の work は haystack 1 本の `includes` のみ。
 */
export const SEARCHABLE_CHARACTERS: readonly SearchableCharacter[] = CHARACTERS.map(
  (char) => ({
    char,
    haystack: normalizeSearchText(
      `${char.name} ${char.shortName} ${char.searchTokens.join(' ')}`,
    ),
  }),
)

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
