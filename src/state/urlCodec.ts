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
 *  v2 payload (Issue #55 で導入。encode/decode 両対応)
 * ============================================================
 *
 * セクション分割型: `<key>=<value>;<key>=<value>...`
 *
 * - v2 時点で必須セクションは `u=` (units) のみ。
 *   - `u=<self>|<ally>|<enemy1>|<enemy2>` の 4 ユニット固定。
 *   - 各ユニットは固定 7 フィールド (v1 と同じ x..lockTarget) + trailing optional
 *     な 8 番目 `characterCode` (空文字で null)。
 *   - 9 番目以降のフィールドは forward compat として **ignore** する
 *     (後続 #A で `hp,boost` を末尾に追加する想定)。
 * - 未知 prefix セクション (`tc=` 等) は **ignore** して残りを decode する
 *   (forward compat)。
 *
 * decode の厳格性 (Issue #55 セカンドオピニオン共通[高] 反映):
 * - **strict** (1 つでも違反 → 全体 reject):
 *   - `u=` セクションが 0 個または 2 個以上 (重複・欠落)
 *   - `u=` の `|` 区切りが 4 個でない
 *   - **固定 7 フィールド** の値・型・列挙トークン・整数範囲が違反
 * - **lenient** (局所 fallback のみ):
 *   - 8 番目 characterCode が空文字 / 不在 → characterId=null
 *   - 8 番目 characterCode が辞書未収録 → characterId=null + DEV warn
 *   - 9 番目以降のフィールド → ignore
 *   - 未知セクション → ignore
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
  INITIAL_BOARD_STATE,
  TEAM_REMAINING_COST_MAX,
  TEAM_REMAINING_COST_MIN,
  TEAM_REMAINING_COST_STEP,
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
  TeamRemainingCost,
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
  // v1 は characterId を持たないので null 固定
  return { id, ...fixed, characterId: null }
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

  // v1 は teamRemainingCost を持たないので初期値で復元 (Issue #60 互換)
  return {
    units: units as Record<UnitId, Unit>,
    teamRemainingCost: {
      ally: TEAM_REMAINING_COST_MAX,
      enemy: TEAM_REMAINING_COST_MAX,
    },
  }
}

// ---- v2 encoder / decoder ----

/**
 * v2 ユニットエンコード: 固定 7 フィールド + 8 番目 characterCode (空文字 = null)。
 */
function encodeV2Unit(unit: Unit): string {
  const character = findCharacterById(unit.characterId)
  const characterCode = character?.code ?? ''
  return `${encodeFixedFields(unit)},${characterCode}`
}

/**
 * Issue #60: teamRemainingCost を `tc=<ally>,<enemy>` にエンコードする。
 * 初期値 (ally=MAX, enemy=MAX) のときは **省略する** (URL 長を短く保ち、
 * 既存共有 URL との完全互換を維持する。セカンドオピニオン[共通高] 反映)。
 */
function encodeTeamRemainingCostSection(tc: TeamRemainingCost): string | null {
  if (
    tc.ally === TEAM_REMAINING_COST_MAX &&
    tc.enemy === TEAM_REMAINING_COST_MAX
  ) {
    return null
  }
  return `tc=${tc.ally},${tc.enemy}`
}

export function encodeV2(state: BoardState): string {
  const units = UNIT_ORDER.map((id) => encodeV2Unit(state.units[id])).join('|')
  const sections = [`u=${units}`]
  const tcSection = encodeTeamRemainingCostSection(state.teamRemainingCost)
  if (tcSection !== null) sections.push(tcSection)
  return sections.join(';')
}

/**
 * v2 1 ユニット分の decode。
 * - fields は `,` 区切りの配列
 * - 固定 7 フィールド未満なら reject
 * - 8 番目 (characterCode) は trailing optional。空文字 / 不在 / 未知 code は characterId=null
 * - 9 番目以降は forward compat として ignore
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

  return { id, ...fixed, characterId }
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

/**
 * Issue #60: tc= セクションを strict に decode する。
 *
 * - **欠落**: `{ ally: MAX, enemy: MAX }` を返す (v1 / tc 無し v2 互換)
 * - **不正** (値数違い / NaN / 範囲外 / 0.5 刻み違反): null (呼び出し側で全体 reject)
 *
 * v2 の固定フィールドと同じ strict 方針: 存在するが壊れている URL は
 * サイレント切り詰めず、全体を reject して「壊れた URL は起動に失敗する」明示的挙動にする。
 */
function decodeTeamRemainingCostSection(
  raw: string | undefined,
): TeamRemainingCost | 'reject' {
  if (raw === undefined) {
    return { ally: TEAM_REMAINING_COST_MAX, enemy: TEAM_REMAINING_COST_MAX }
  }
  const parts = raw.split(',')
  if (parts.length !== 2) return 'reject'
  const [allyStr, enemyStr] = parts
  const ally = Number(allyStr)
  const enemy = Number(enemyStr)
  if (!Number.isFinite(ally) || !Number.isFinite(enemy)) return 'reject'
  for (const value of [ally, enemy]) {
    if (value < TEAM_REMAINING_COST_MIN || value > TEAM_REMAINING_COST_MAX) {
      return 'reject'
    }
    // 0.5 刻み違反は reject (浮動小数誤差を避けるため 2 倍して整数判定)
    if (!Number.isInteger(value / TEAM_REMAINING_COST_STEP)) return 'reject'
  }
  return { ally, enemy }
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

  // Issue #60: tc= セクション (optional)
  const tcResult = decodeTeamRemainingCostSection(sections.get('tc'))
  if (tcResult === 'reject') return null

  // 未知 prefix セクションは sections.get で参照しないので自然に ignore される
  return {
    units: units as Record<UnitId, Unit>,
    teamRemainingCost: tcResult,
  }
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

  if (version === 'v1') return decodeV1(payload)
  if (version === 'v2') return decodeV2(payload)
  return null
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
