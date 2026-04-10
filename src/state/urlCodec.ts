/**
 * 盤面状態 ↔ URL クエリパラメータ間のエンコード/デコード。
 *
 * Phase 5 (Issue #6) で導入。URL 共有のために盤面状態をコンパクトに直列化する。
 *
 * フォーマット: `?b=<version>.<base64url payload>`
 *
 * - `<version>` は base64url の外に出している。decode 前に「どのスキーマで解釈
 *   するか」を判定でき、v2 が来たときも v1 を残せる。
 * - v1 payload は **期待順 ['self','ally','enemy1','enemy2'] 固定** の `|` 区切り、
 *   各ユニットは 7 フィールドの `,` 区切り (順: x, y, direction, cost, starburst,
 *   coreType, lockTarget)。
 * - 離散型 (Cost / StarburstLevel / CoreType / Direction / LockTarget) は
 *   **列挙インデックス/トークン** で持つ。`parseFloat` のような曖昧な数値 parse
 *   は使わず、lookup table で復元する (`12abc → 12` のような通り抜けを防ぐ)。
 * - x/y は `Math.round` で整数化した上で、decode では `Number()` + `isInteger`
 *   で検証し、constants/board.ts の安全範囲外なら reject (clamp に頼らない)。
 *
 * バージョニング戦略:
 * - v1 decoder は `UNIT_IDS` の実行時値を見ず、期待順をハードコードする。
 *   これにより v2 で 5 機構成にしても v1 decoder が壊れない。
 * - 後方互換: v2 が来たら `decode()` 内で version-dispatch する。v1 decoder は
 *   そのまま残し、v1 → 現在の BoardState 型への正規化は decoder の責務。
 * - encode は常に最新 (v1) を出力する。
 *
 * payload は ASCII 限定 (略号 + 数字のみ)。将来 JSON 化や日本語ラベル混入を
 * したくなったら、base64url 実装に Unicode 対応を加える必要があるので注意。
 */

import {
  UNIT_COORD_X_MAX,
  UNIT_COORD_X_MIN,
  UNIT_COORD_Y_MAX,
  UNIT_COORD_Y_MIN,
} from '../constants/board'
import { INITIAL_BOARD_STATE } from '../constants/game'
import type {
  BoardState,
  CoreType,
  Cost,
  Direction,
  StarburstLevel,
  Unit,
  UnitId,
} from '../types/board'

export const SCHEMA_VERSION = 'v1'

/**
 * v1 decoder が期待するユニットの順序。
 * UNIT_IDS の実行時値ではなく、後方互換のため明示的にハードコード。
 * v2 でユニット数や順序が変わっても v1 decoder が壊れないようにする。
 */
const V1_UNIT_ORDER: readonly UnitId[] = ['self', 'ally', 'enemy1', 'enemy2']

const V1_UNIT_FIELD_COUNT = 7

/**
 * 整数化した安全範囲。
 *
 * UNIT_COORD_*_{MIN,MAX} は浮動小数 (例: UNIT_COORD_Y_MAX = 665.5) なので、
 * Math.round で整数化した値が元の範囲を超えるケースがある。
 * v1 では座標を整数で持つ方針なので、`ceil(MIN)..floor(MAX)` の整数範囲を
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

/**
 * base64 → base64url 変換。
 * `+` → `-`、`/` → `_`、末尾の `=` を削除。
 */
function base64ToBase64Url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * base64url → base64 変換。padding を復元。
 */
function base64UrlToBase64(b64url: string): string {
  const replaced = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = (4 - (replaced.length % 4)) % 4
  return replaced + '='.repeat(padLen)
}

/**
 * ASCII 文字列を base64url にエンコード。
 * v1 payload は ASCII 限定なので btoa() の Latin-1 制約は問題にならない。
 */
function encodeBase64Url(ascii: string): string {
  // SSR ガード: btoa は Node にもあるが、念のため window 経由を避けて直接呼ぶ
  return base64ToBase64Url(btoa(ascii))
}

/**
 * base64url を ASCII 文字列にデコード。
 * 不正な入力 (`atob` が throw する場合) は null を返す。
 */
function decodeBase64Url(b64url: string): string | null {
  try {
    return atob(base64UrlToBase64(b64url))
  } catch {
    return null
  }
}

// ---- v1 encoder ----

function encodeV1Unit(unit: Unit): string {
  const directionIndex = DIRECTION_INDEX_TO_DEGREE.indexOf(unit.direction)
  // 型レベルで Direction は離散値だが、念のため index === -1 をガード
  if (directionIndex === -1) {
    throw new Error(`Invalid direction: ${String(unit.direction)}`)
  }
  const costToken = COST_VALUE_TO_TOKEN[unit.cost]
  const starburstToken = STARBURST_LEVEL_TO_TOKEN[unit.starburst]
  const lockToken = LOCK_TARGET_ID_TO_TOKEN[unit.lockTarget ?? 'null']

  // 整数範囲に clamp してから round することで、decode 側の検証範囲と確実に整合する
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

export function encodeV1(state: BoardState): string {
  return V1_UNIT_ORDER.map((id) => encodeV1Unit(state.units[id])).join('|')
}

export function encode(state: BoardState): string {
  return `${SCHEMA_VERSION}.${encodeBase64Url(encodeV1(state))}`
}

// ---- v1 decoder ----

/**
 * 1 ユニット分のフィールド配列を Unit に復元。
 * 1 つでも検証に失敗したら null を返す。
 *
 * テスト容易性のため独立 export。
 */
export function decodeV1Unit(fields: string[], id: UnitId): Unit | null {
  if (fields.length !== V1_UNIT_FIELD_COUNT) return null

  const [xStr, yStr, dirStr, costStr, sbStr, coreStr, lockStr] = fields

  // x / y: Number() + isInteger で厳格に検証 (parseFloat の通り抜けを避ける)
  // 範囲は整数化した X_INT_*/Y_INT_* を使い、encode 側の clamp 後の値と整合させる
  const x = Number(xStr)
  const y = Number(yStr)
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null
  if (x < X_INT_MIN || x > X_INT_MAX) return null
  if (y < Y_INT_MIN || y > Y_INT_MAX) return null

  // direction: 0..7 のインデックス
  const dirIdx = Number(dirStr)
  if (!Number.isInteger(dirIdx) || dirIdx < 0 || dirIdx > 7) return null
  const direction = DIRECTION_INDEX_TO_DEGREE[dirIdx]

  // cost / starburst / core / lockTarget: lookup table で復元
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

  return {
    id,
    x,
    y,
    direction,
    cost,
    starburst,
    coreType,
    lockTarget,
  }
}

export function decodeV1(payload: string): BoardState | null {
  const unitChunks = payload.split('|')
  if (unitChunks.length !== V1_UNIT_ORDER.length) return null

  const units: Partial<Record<UnitId, Unit>> = {}
  for (let i = 0; i < V1_UNIT_ORDER.length; i++) {
    const id = V1_UNIT_ORDER[i]
    const unit = decodeV1Unit(unitChunks[i].split(','), id)
    if (unit === null) return null
    units[id] = unit
  }

  return { units: units as Record<UnitId, Unit> }
}

export function decode(s: string): BoardState | null {
  // version-dispatch: 「v1.」で始まる場合のみ v1 decoder に渡す
  // 将来 v2 が来たら if 分岐を追加する
  const dot = s.indexOf('.')
  if (dot === -1) return null
  const version = s.slice(0, dot)
  const b64 = s.slice(dot + 1)

  if (version === SCHEMA_VERSION) {
    const payload = decodeBase64Url(b64)
    if (payload === null) return null
    return decodeV1(payload)
  }

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
