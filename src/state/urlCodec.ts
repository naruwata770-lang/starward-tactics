/**
 * 盤面状態 ↔ URL クエリパラメータ間のエンコード/デコード。
 *
 * Phase 5 (Issue #6) で v1 を導入。Issue #55 で v2 を導入。
 *
 * フォーマット: `?b=<version>.<base64url payload>`
 *
 * - `<version>` は base64url の外に出している。decode 前に「どのスキーマで解釈
 *   するか」を判定でき、新バージョンでも旧版を残せる。
 *
 * ============================================================
 *  v1 payload (互換維持のために残す。encode はもう使わない)
 * ============================================================
 *
 * - 期待順 ['self','ally','enemy1','enemy2'] 固定の `|` 区切り。
 * - 各ユニットは 7 フィールドの `,` 区切り (x, y, direction, cost, starburst,
 *   coreType, lockTarget)。characterId は無いので decode 後は null になる。
 *
 * ============================================================
 *  v2 payload (Issue #55 で導入。encode/decode 両対応。Issue #58 で hp,boost 追加)
 * ============================================================
 *
 * セクション分割型: `<key>=<value>;<key>=<value>...`
 *
 * - v2 時点で必須セクションは `u=` (units) のみ。
 *   - `u=<self>|<ally>|<enemy1>|<enemy2>` の 4 ユニット固定。
 *   - 各ユニットのフィールドは以下の **固定 7 + trailing optional 3**:
 *     - 1..7: 固定 (x, y, direction, cost, starburst, coreType, lockTarget)
 *     - 8: characterCode (Issue #55, 空文字 = null)
 *     - 9: hp (Issue #58, 空文字 = null)
 *     - 10: boost (Issue #58, 空文字 = 100 デフォルト)
 *   - 11 番目以降のフィールドは forward compat として **ignore** する。
 * - 未知 prefix セクション (`tc=` 等) は **ignore** して残りを decode する
 *   (forward compat)。
 *
 * encoder 正規形ルール (Issue #58 セカンドオピニオン Codex[共通・高] 反映):
 * 「同じ意味だが文字列が違う URL」を出さないため、末尾フィールドの省略規則を
 * 厳密に決める。
 *
 * | state | encoded suffix |
 * |---|---|
 * | hp=null && boost=100 | 省略 (8 fields) |
 * | hp=number && boost=100 | `...,characterCode,<hp>` (9 fields) |
 * | hp=null && boost!=100 | `...,characterCode,,<boost>` (10 fields, hp=空) |
 * | hp=number && boost!=100 | `...,characterCode,<hp>,<boost>` (10 fields) |
 *
 * decode の厳格性:
 * - **strict** (1 つでも違反 → 全体 reject):
 *   - `u=` セクションが 0 個または 2 個以上 (重複・欠落)
 *   - `u=` の `|` 区切りが 4 個でない
 *   - **固定 7 フィールド** の値・型・列挙トークン・整数範囲が違反
 *   - 9 番目 hp が「空文字でも整数でもない」(部分的に書かれた壊れた URL を弾く)
 *   - 10 番目 boost が「空文字でも整数でもない」、または整数だが 0..100 の範囲外
 *   - 9 番目 hp が整数だが 0..HP_DECODE_MAX の範囲外
 * - **lenient** (局所 fallback のみ):
 *   - 8 番目 characterCode が空文字 / 不在 → characterId=null
 *   - 8 番目 characterCode が辞書未収録 → characterId=null + DEV warn
 *   - 9 番目 hp が空文字 / 不在 → hp=null
 *   - 10 番目 boost が空文字 / 不在 → boost=100
 *   - 11 番目以降のフィールド → ignore
 *   - 未知セクション → ignore
 *
 * decode 後の正規化 (Issue #58 セカンドオピニオン Codex[共通・高] 反映):
 * - decoder は characterId と hp の整合を取らない (疎結合)。代わりに
 *   `normalizeBoardState` を decode の出口で必ず通し、不整合を補正する:
 *   - characterId === null なら hp = null 強制
 *   - characterId !== null なら hp を 0..maxHp に再 clamp
 *   - boost を 0..100 に再 clamp + 整数化
 * - これにより `LOAD_STATE` 経路 (App.tsx initialState / popstate) でも常に
 *   整合した state がアプリに入る。reducer の SET_HP / SET_BOOST clamp は
 *   UI 経由のガードであり、URL 経由の不整合からは normalize で防ぐ。
 *
 * ============================================================
 *  バージョニング戦略
 * ============================================================
 *
 * - v1 decoder は `UNIT_IDS` の実行時値を見ず、期待順をハードコードする。
 *   v2 で 5 機構成にしても v1 decoder が壊れない。
 * - 後方互換: `decode()` 内で version-dispatch する。
 * - encode は常に最新 (v2) を出力する。
 *
 * payload は ASCII 限定 (略号 + 数字 + 区切り文字)。将来 JSON 化や日本語ラベル
 * 混入をしたくなったら、base64url 実装に Unicode 対応を加える必要がある。
 */

import {
  UNIT_COORD_X_MAX,
  UNIT_COORD_X_MIN,
  UNIT_COORD_Y_MAX,
  UNIT_COORD_Y_MIN,
} from '../constants/board'
import {
  BOOST_MAX,
  HP_DECODE_MAX,
  INITIAL_BOARD_STATE,
} from '../constants/game'
import {
  findCharacterByCode,
  findCharacterById,
} from '../data/characters'
import type {
  BoardState,
  CoreType,
  Cost,
  Direction,
  StarburstLevel,
  Unit,
  UnitId,
} from '../types/board'

/**
 * encode が現在出力するスキーマバージョン。
 * decode は v1 / v2 の両方を受け付ける (旧 URL の後方互換)。
 */
export const SCHEMA_VERSION = 'v2'

/**
 * v1 decoder が期待するユニットの順序。
 * v2 でも同じ順序を使うため共通定数化。
 */
const UNIT_ORDER: readonly UnitId[] = ['self', 'ally', 'enemy1', 'enemy2']

/** v1 では 7 フィールド固定 */
const V1_UNIT_FIELD_COUNT = 7

/** v2 で「strict 検証する固定 prefix」のフィールド数。これより多い末尾は optional */
const V2_FIXED_FIELD_COUNT = 7

/**
 * 整数化した安全範囲。
 *
 * UNIT_COORD_*_{MIN,MAX} は浮動小数 (例: UNIT_COORD_Y_MAX = 665.5) なので、
 * Math.round で整数化した値が元の範囲を超えるケースがある。
 * v1/v2 では座標を整数で持つ方針なので、`ceil(MIN)..floor(MAX)` の整数範囲を
 * 別途定義し、encode 側ではこの範囲に clamp してから round、decode 側では
 * この整数範囲で検証する。両側で同じ範囲を使うので round-trip は安全。
 */
const X_INT_MIN = Math.ceil(UNIT_COORD_X_MIN)
const X_INT_MAX = Math.floor(UNIT_COORD_X_MAX)
const Y_INT_MIN = Math.ceil(UNIT_COORD_Y_MIN)
const Y_INT_MAX = Math.floor(UNIT_COORD_Y_MAX)

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ---- 列挙トークン ↔ 値 のマッピング ----

const COST_TOKEN_TO_VALUE: Record<string, Cost> = {
  a: 1.5,
  b: 2,
  c: 2.5,
  d: 3,
}
const COST_VALUE_TO_TOKEN: Record<number, string> = {
  1.5: 'a',
  2: 'b',
  2.5: 'c',
  3: 'd',
}

const STARBURST_TOKEN_TO_LEVEL: Record<string, StarburstLevel> = {
  n: 'none',
  h: 'half',
  f: 'full',
}
const STARBURST_LEVEL_TO_TOKEN: Record<StarburstLevel, string> = {
  none: 'n',
  half: 'h',
  full: 'f',
}

const CORE_TYPE_TOKENS: ReadonlySet<CoreType> = new Set([
  'F',
  'S',
  'M',
  'D',
  'B',
  'C',
])

const LOCK_TARGET_TOKEN_TO_ID: Record<string, UnitId | null> = {
  _: null,
  s: 'self',
  a: 'ally',
  '1': 'enemy1',
  '2': 'enemy2',
}
const LOCK_TARGET_ID_TO_TOKEN: Record<string, string> = {
  null: '_',
  self: 's',
  ally: 'a',
  enemy1: '1',
  enemy2: '2',
}

/** Direction の `0..7` インデックス → 度数 */
const DIRECTION_INDEX_TO_DEGREE: readonly Direction[] = [
  0, 45, 90, 135, 180, 225, 270, 315,
]

// ---- base64url helpers ----

function base64ToBase64Url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBase64(b64url: string): string {
  const replaced = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = (4 - (replaced.length % 4)) % 4
  return replaced + '='.repeat(padLen)
}

function encodeBase64Url(ascii: string): string {
  return base64ToBase64Url(btoa(ascii))
}

function decodeBase64Url(b64url: string): string | null {
  try {
    return atob(base64UrlToBase64(b64url))
  } catch {
    return null
  }
}

// ---- 共通: 固定 7 フィールドの strict 検証 ----

interface FixedFields {
  x: number
  y: number
  direction: Direction
  cost: Cost
  starburst: StarburstLevel
  coreType: CoreType
  lockTarget: UnitId | null
}

/**
 * 固定 7 フィールド (x..lockTarget) を strict 検証して返す。
 * 1 つでも違反したら null。v1 / v2 共通。
 */
function decodeFixedFields(fields: string[], id: UnitId): FixedFields | null {
  const [xStr, yStr, dirStr, costStr, sbStr, coreStr, lockStr] = fields

  const x = Number(xStr)
  const y = Number(yStr)
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null
  if (x < X_INT_MIN || x > X_INT_MAX) return null
  if (y < Y_INT_MIN || y > Y_INT_MAX) return null

  const dirIdx = Number(dirStr)
  if (!Number.isInteger(dirIdx) || dirIdx < 0 || dirIdx > 7) return null
  const direction = DIRECTION_INDEX_TO_DEGREE[dirIdx]

  const cost = COST_TOKEN_TO_VALUE[costStr]
  if (cost === undefined) return null

  const starburst = STARBURST_TOKEN_TO_LEVEL[sbStr]
  if (starburst === undefined) return null

  if (!CORE_TYPE_TOKENS.has(coreStr as CoreType)) return null
  const coreType = coreStr as CoreType

  if (!(lockStr in LOCK_TARGET_TOKEN_TO_ID)) return null
  const lockTarget = LOCK_TARGET_TOKEN_TO_ID[lockStr]

  // 自己ロック禁止 (UI / reducer と同じ制約)
  if (lockTarget === id) return null

  return { x, y, direction, cost, starburst, coreType, lockTarget }
}

function encodeFixedFields(unit: Unit): string {
  const directionIndex = DIRECTION_INDEX_TO_DEGREE.indexOf(unit.direction)
  if (directionIndex === -1) {
    throw new Error(`Invalid direction: ${String(unit.direction)}`)
  }
  const costToken = COST_VALUE_TO_TOKEN[unit.cost]
  const starburstToken = STARBURST_LEVEL_TO_TOKEN[unit.starburst]
  const lockToken = LOCK_TARGET_ID_TO_TOKEN[unit.lockTarget ?? 'null']

  const xInt = clampInt(Math.round(unit.x), X_INT_MIN, X_INT_MAX)
  const yInt = clampInt(Math.round(unit.y), Y_INT_MIN, Y_INT_MAX)

  return [
    xInt.toString(),
    yInt.toString(),
    directionIndex.toString(),
    costToken,
    starburstToken,
    unit.coreType,
    lockToken,
  ].join(',')
}

// ---- v1 encoder / decoder ----

/**
 * v1 encoder。
 * Issue #55 以降 encode は v2 を使うが、v1 文字列を生成するヘルパとして残す
 * (テスト容易性 + 万一の rollback 用)。
 */
export function encodeV1(state: BoardState): string {
  return UNIT_ORDER.map((id) => encodeFixedFields(state.units[id])).join('|')
}

/**
 * 1 ユニット分のフィールド配列を Unit に復元 (v1)。
 * 1 つでも検証に失敗したら null を返す。テスト容易性のため独立 export。
 */
export function decodeV1Unit(fields: string[], id: UnitId): Unit | null {
  if (fields.length !== V1_UNIT_FIELD_COUNT) return null
  const fixed = decodeFixedFields(fields, id)
  if (fixed === null) return null
  // v1 は characterId / hp / boost を持たないのでデフォルト固定:
  // - characterId: null (Issue #55)
  // - hp: null (Issue #58, 機体未選択と整合)
  // - boost: 100 (Issue #58, 満タン default)
  return { id, ...fixed, characterId: null, hp: null, boost: BOOST_MAX }
}

export function decodeV1(payload: string): BoardState | null {
  const unitChunks = payload.split('|')
  if (unitChunks.length !== UNIT_ORDER.length) return null

  const units: Partial<Record<UnitId, Unit>> = {}
  for (let i = 0; i < UNIT_ORDER.length; i++) {
    const id = UNIT_ORDER[i]
    const unit = decodeV1Unit(unitChunks[i].split(','), id)
    if (unit === null) return null
    units[id] = unit
  }

  return { units: units as Record<UnitId, Unit> }
}

// ---- v2 encoder / decoder ----

/**
 * v2 ユニットエンコード:
 * - 固定 7 フィールド + 8 番目 characterCode (空文字 = null)
 * - 9 番目 hp / 10 番目 boost は **正規形ルール** に従って省略する (Issue #58):
 *   - hp=null && boost=100 (デフォルト) → 9, 10 を省略 (8 fields)
 *   - hp=number && boost=100 → 9 だけ書く (9 fields)
 *   - hp=null && boost!=100 → 9 を空文字、10 に boost (10 fields)
 *   - hp=number && boost!=100 → 9 に hp, 10 に boost (10 fields)
 *
 * 「同じ意味の state が同じ encoded を返す」ことを保証 (Codex[共通・高] 反映)。
 */
function encodeV2Unit(unit: Unit): string {
  const character = findCharacterById(unit.characterId)
  const characterCode = character?.code ?? ''
  const fixedAndCharacter = `${encodeFixedFields(unit)},${characterCode}`

  // hp は null と 0 を厳密に区別する (Codex/Gemini[共通・高] 反映)。
  // truthy 判定 (`if (unit.hp)`) は 0 を null と混同するため禁止。
  const hpStr =
    unit.hp === null ? '' : Math.max(0, Math.min(HP_DECODE_MAX, Math.round(unit.hp))).toString()
  const boostInt = Math.max(0, Math.min(BOOST_MAX, Math.round(unit.boost)))

  // デフォルト判定: 両方デフォルト → 末尾省略
  const isHpDefault = unit.hp === null
  const isBoostDefault = boostInt === BOOST_MAX

  if (isHpDefault && isBoostDefault) {
    return fixedAndCharacter // 8 fields
  }
  if (isBoostDefault) {
    return `${fixedAndCharacter},${hpStr}` // 9 fields (boost 省略)
  }
  // 10 fields (boost あり; hp=null なら hpStr は空文字)
  return `${fixedAndCharacter},${hpStr},${boostInt}`
}

export function encodeV2(state: BoardState): string {
  const units = UNIT_ORDER.map((id) => encodeV2Unit(state.units[id])).join('|')
  return `u=${units}`
}

/**
 * v2 1 ユニット分の decode。
 * - fields は `,` 区切りの配列
 * - 固定 7 フィールド未満なら reject
 * - 8 番目 (characterCode) は trailing optional。空文字 / 不在 / 未知 code は characterId=null
 * - 9 番目 (hp) は trailing optional。空文字 / 不在 → null。整数なら 0..HP_DECODE_MAX に
 *   strict 検証、範囲外 / 非整数なら全体 reject (Issue #58)
 * - 10 番目 (boost) は trailing optional。空文字 / 不在 → 100。整数なら 0..100 に
 *   strict 検証、範囲外 / 非整数なら全体 reject (Issue #58)
 * - 11 番目以降は forward compat として ignore
 *
 * 整合性 (characterId vs hp など) の補正は decoder ではなく `normalizeBoardState`
 * 側で行う (関心の分離; Codex[共通・高] 反映)。
 */
function decodeV2Unit(fields: string[], id: UnitId): Unit | null {
  if (fields.length < V2_FIXED_FIELD_COUNT) return null
  const fixed = decodeFixedFields(fields.slice(0, V2_FIXED_FIELD_COUNT), id)
  if (fixed === null) return null

  // characterCode は trailing optional
  const codeRaw = fields[V2_FIXED_FIELD_COUNT]
  let characterId: string | null = null
  if (codeRaw !== undefined && codeRaw !== '') {
    const character = findCharacterByCode(codeRaw)
    if (character !== null) {
      characterId = character.id
    } else if (import.meta.env.DEV) {
      // 未知 code: 運用ミス (機体削除 / code 改名) の早期検出のため DEV 環境で warn。
      // ユーザーには見せず characterId=null に fallback (Issue #55 採用方針)
      console.warn(`[urlCodec] unknown characterCode: ${codeRaw}`)
    }
  }

  // hp は trailing optional (index 8 = 9 番目)。
  // 空文字 / 不在 → null。それ以外は整数 strict 検証 (truthy 判定禁止)。
  const hpRaw = fields[V2_FIXED_FIELD_COUNT + 1]
  let hp: number | null = null
  if (hpRaw !== undefined && hpRaw !== '') {
    const hpNum = Number(hpRaw)
    if (!Number.isInteger(hpNum)) return null
    if (hpNum < 0 || hpNum > HP_DECODE_MAX) return null
    hp = hpNum
  }

  // boost は trailing optional (index 9 = 10 番目)。
  // 空文字 / 不在 → BOOST_MAX (100)。それ以外は整数 strict 検証。
  const boostRaw = fields[V2_FIXED_FIELD_COUNT + 2]
  let boost: number = BOOST_MAX
  if (boostRaw !== undefined && boostRaw !== '') {
    const boostNum = Number(boostRaw)
    if (!Number.isInteger(boostNum)) return null
    if (boostNum < 0 || boostNum > BOOST_MAX) return null
    boost = boostNum
  }

  return { id, ...fixed, characterId, hp, boost }
}

/**
 * v2 セクション分割パーサー。
 *
 * - 入力: `<key>=<value>;<key>=<value>;...`
 * - 戻り値: Map<key, value>。**重複 key は reject (null)**
 * - 空 payload や key=value 形式違反は reject
 *
 * 値そのものに `=` が含まれる可能性は v2 時点で存在しないが、最初の `=` で
 * key/value を分割する (将来の拡張で base64 等が値になっても壊れない)。
 */
function parseV2Sections(payload: string): Map<string, string> | null {
  if (payload === '') return null
  const sections = payload.split(';')
  const map = new Map<string, string>()
  for (const section of sections) {
    // 末尾セミコロン (`u=...;`) や連続セミコロン (`u=...;;tc=...`) で生じる空 section は
    // forward compat のため lenient に skip する (Codex/Gemini レビュー[共通] 反映)。
    // 仕様コメントは「`<key>=<value>;<key>=<value>...`」だが、手打ち URL や別実装が
    // 末尾 `;` を付けるケースまで全体 reject すると互換性を不必要に壊す。
    if (section === '') continue
    const eq = section.indexOf('=')
    if (eq === -1) return null // key=value 形式違反
    const key = section.slice(0, eq)
    const value = section.slice(eq + 1)
    if (key === '') return null
    if (map.has(key)) return null // 重複 key は reject
    map.set(key, value)
  }
  return map
}

export function decodeV2(payload: string): BoardState | null {
  const sections = parseV2Sections(payload)
  if (sections === null) return null

  // 必須セクション: u=
  const unitsRaw = sections.get('u')
  if (unitsRaw === undefined) return null

  const unitChunks = unitsRaw.split('|')
  if (unitChunks.length !== UNIT_ORDER.length) return null

  const units: Partial<Record<UnitId, Unit>> = {}
  for (let i = 0; i < UNIT_ORDER.length; i++) {
    const id = UNIT_ORDER[i]
    const unit = decodeV2Unit(unitChunks[i].split(','), id)
    if (unit === null) return null
    units[id] = unit
  }

  // 未知 prefix セクションは sections.get で参照しないので自然に ignore される
  return { units: units as Record<UnitId, Unit> }
}

// ---- normalize ----

/**
 * decode 後の不整合を補正する関数 (Issue #58 セカンドオピニオン Codex[共通・高] 反映)。
 *
 * decoder は characterId / hp / boost を疎結合に検証するため、
 * 「characterId=null だが hp=300」「hp が未知機体の maxHp を超える」のような
 * 不整合が通り抜ける可能性がある。これを補正してアプリ層に渡す。
 *
 * 補正ルール:
 * - characterId === null → hp = null 強制 (機体未選択時に HP 値が残らない)
 * - characterId !== null:
 *   - 機体未収録 (lookup miss) → characterId = null + hp = null (decoder 側で
 *     既に null fallback されるが、念のため二重に押さえる)
 *   - 機体あり: hp が null なら maxHp を割り当て (機体選択中に HP 表示なしは
 *     UX 矛盾のため、URL 上で意図的に hp=空文字とした場合のみ起きる稀ケース)
 *   - 機体あり: hp が number なら 0..maxHp に再 clamp
 * - boost は 0..100 の整数に再 clamp + Math.round (decoder で strict 検証
 *   済みだが、将来 decoder を緩めても normalize で守る)
 *
 * 呼び出し点: `decode` 関数の出口。LOAD_STATE 経路 (App.tsx initialState /
 * popstate) も decode 経由なので自然にカバーされる。
 *
 * 参照同一性: 補正なしなら入力 state をそのまま返す (React の bailout を効かせる)。
 */
export function normalizeBoardState(state: BoardState): BoardState {
  let changed = false
  const normalizedUnits: Record<UnitId, Unit> = { ...state.units }
  for (const id of UNIT_ORDER) {
    const unit = state.units[id]
    const character = findCharacterById(unit.characterId)
    let hp = unit.hp
    let characterId = unit.characterId

    // characterId が string だが lookup miss → null に正規化 (decoder で fallback 済みのはず)
    if (unit.characterId !== null && character === null) {
      characterId = null
    }

    if (characterId === null) {
      // 機体未選択時は hp 必ず null
      if (hp !== null) hp = null
    } else {
      // ここで character は確実に存在 (上のガードで characterId と同期済み)
      const charForUnit = findCharacterById(characterId)
      if (charForUnit !== null) {
        if (hp === null) {
          // 機体選択中に hp=null は URL 上の不整合。maxHp に補完
          hp = charForUnit.maxHp
        } else {
          const clamped = Math.max(0, Math.min(charForUnit.maxHp, Math.round(hp)))
          if (clamped !== hp) hp = clamped
        }
      }
    }

    const boostInt = Math.max(0, Math.min(BOOST_MAX, Math.round(unit.boost)))

    if (
      characterId !== unit.characterId ||
      hp !== unit.hp ||
      boostInt !== unit.boost
    ) {
      normalizedUnits[id] = { ...unit, characterId, hp, boost: boostInt }
      changed = true
    }
  }
  if (!changed) return state
  return { units: normalizedUnits }
}

// ---- top-level encode / decode ----

export function encode(state: BoardState): string {
  return `${SCHEMA_VERSION}.${encodeBase64Url(encodeV2(state))}`
}

export function decode(s: string): BoardState | null {
  // version-dispatch: prefix を見て v1 / v2 のどちらかへ
  const dot = s.indexOf('.')
  if (dot === -1) return null
  const version = s.slice(0, dot)
  const b64 = s.slice(dot + 1)

  const payload = decodeBase64Url(b64)
  if (payload === null) return null

  let decoded: BoardState | null
  if (version === 'v1') decoded = decodeV1(payload)
  else if (version === 'v2') decoded = decodeV2(payload)
  else return null

  if (decoded === null) return null
  // Issue #58: decode 出口で必ず正規化を通す。
  // App.tsx initialState / popstate の LOAD_STATE どちらも decode 経由なので、
  // ここで通せばアプリに不整合 state が入らない。
  return normalizeBoardState(decoded)
}

// ---- default 判定 ----

/**
 * 現在の state が初期状態と完全一致するかを encode 結果で判定。
 *
 * URL クエリ書き出し時に「default なら ?b= を消す」という UX 配慮のために使う。
 * encode 結果ベースなので、座標の小数誤差なども丸め込まれた上で比較される。
 */
const INITIAL_ENCODED = encode(INITIAL_BOARD_STATE)

export function isInitialEncoded(encoded: string): boolean {
  return encoded === INITIAL_ENCODED
}
