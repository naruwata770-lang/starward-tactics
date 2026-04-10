/**
 * 盤面の幾何定数。
 *
 * SVG 描画 (Board / SvgDefs / GridBackground / UnitToken) と
 * 座標クランプ (boardReducer) で共有する値を集約する。
 *
 * 散在を防ぐ目的:
 * - 同じ「盤面サイズ 720」「グリッド 48」「ユニット半径 30」が複数ファイルで
 *   ハードコードされていると、調整時に修正漏れが起きる
 * - Phase 9 の PNG 出力でも同じ定数を参照する想定
 *
 * ゲームドメインの定数 (色・コスト・コア種別など) は constants/game.ts に置く。
 * このファイルは「盤面の見た目と座標系」の定数のみ。
 */

/** SVG viewBox の一辺サイズ (px) */
export const VIEW_BOX_SIZE = 720

/** グリッド pattern の一マスサイズ (px) */
export const GRID_SIZE = 48

/** ユニット円の半径 */
export const UNIT_RADIUS = 30

/** ユニット円の縁取り幅 */
export const UNIT_STROKE_WIDTH = 2

/** 名前ラベル (ピル) の幅 */
export const UNIT_LABEL_WIDTH = 56

/** 名前ラベル (ピル) の高さ */
export const UNIT_LABEL_HEIGHT = 18

/** 円の下端からラベル上端までの隙間 */
export const UNIT_LABEL_GAP = 6

/**
 * ユニット中心 (x, y) の許容範囲。
 *
 * 円とラベルが viewBox からはみ出さないよう、描画サイズぶんマージンを取る。
 * - 左/右/上: 円の半径ぶん内側
 * - 下: 円の半径 + ラベルの高さ + 隙間 ぶん内側 (ラベルが下に出るため非対称)
 *
 * boardReducer の MOVE_UNIT / COMMIT_MOVE はこの範囲にクランプする。
 */
export const UNIT_COORD_X_MIN = UNIT_RADIUS
export const UNIT_COORD_X_MAX = VIEW_BOX_SIZE - UNIT_RADIUS
export const UNIT_COORD_Y_MIN = UNIT_RADIUS
export const UNIT_COORD_Y_MAX =
  VIEW_BOX_SIZE - UNIT_RADIUS - UNIT_LABEL_GAP - UNIT_LABEL_HEIGHT
