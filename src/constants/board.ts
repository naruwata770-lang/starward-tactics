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

/** 名前ラベル (ピル) の枠線の幅 */
export const UNIT_LABEL_STROKE_WIDTH = 1

/** 名前ラベル (ピル) の幅 */
export const UNIT_LABEL_WIDTH = 56

/** 名前ラベル (ピル) の高さ */
export const UNIT_LABEL_HEIGHT = 18

/** 円の下端からラベル上端までの隙間 */
export const UNIT_LABEL_GAP = 6

/** ラベル (ピル) のテキスト font-size */
export const UNIT_LABEL_FONT_SIZE = 12

/**
 * 円の中央に表示するコスト数値の font-size。
 * 参考元 (kuro7983 EXVS2IB) と同じく「最も大事な数字を中央に大きく」の方針。
 */
export const UNIT_COST_FONT_SIZE = 20

/** SB ゲージ 1 セグメントあたりの幅 */
export const UNIT_SB_BAR_WIDTH = 12

/** SB ゲージ 1 セグメントあたりの高さ */
export const UNIT_SB_BAR_HEIGHT = 5

/** SB ゲージ 2 セグメント間の隙間 */
export const UNIT_SB_BAR_GAP = 2

/**
 * 円中心から SB ゲージ上端までの距離。
 * コスト文字 (font 20、円中心配置) の下に少し離して置く。
 */
export const UNIT_SB_Y_OFFSET = 13

/**
 * コスト文字の y ずらし幅。unit.y (円中心) からこの分だけ上にずらす。
 * 下に SB ゲージを置くスペースを確保するための微調整。
 */
export const UNIT_COST_Y_NUDGE = 2

/** コスト文字の色 (円中央、太字白) */
export const UNIT_COST_TEXT_COLOR = '#f8fafc' // slate-50

/** 名前ラベル (ピル) の背景色。濃紺で SB バーの空状態と揃える。 */
export const UNIT_LABEL_BG_COLOR = '#0f172a' // slate-900

/** 名前ラベル (ピル) のテキスト色 */
export const UNIT_LABEL_TEXT_COLOR = '#e2e8f0' // slate-200

/** 円の stroke 色 (濃紺、ピル背景と同色) */
export const UNIT_STROKE_COLOR = '#0f172a' // slate-900

/**
 * SB ゲージ点灯時の色。amber-400。
 */
export const UNIT_SB_BAR_FILLED_COLOR = '#fbbf24'

/**
 * SB ゲージ空状態の色。
 * ピル背景と同じ濃紺にすることで、円の明色 (sky/blue/red/rose) とのコントラストを
 * 強くする (薄い slate だと色付き円の上で見えにくい)。
 */
export const UNIT_SB_BAR_EMPTY_COLOR = '#0f172a' // slate-900

/**
 * SVG の stroke は path の中心線から内外に半分ずつ広がる。
 * 安全範囲を計算する際は描画寸法 (半径や高さ) に加えてこの分も内側に
 * 食い込ませないと、境界値で 1px 程度のはみ出しが残る。
 */
const UNIT_STROKE_HALF = UNIT_STROKE_WIDTH / 2
const UNIT_LABEL_STROKE_HALF = UNIT_LABEL_STROKE_WIDTH / 2

/**
 * ユニット中心 (x, y) の許容範囲。
 *
 * 円とラベル (枠線を含む) が viewBox からはみ出さないよう、描画寸法ぶん
 * マージンを取る。
 * - 左/右/上: 円の半径 + 円 stroke 半幅 ぶん内側
 * - 下: 円下端より下に出るラベル全体 (gap + label height + label stroke 半幅)
 *       ぶん内側 (上下非対称)
 *
 * boardReducer の MOVE_UNIT / COMMIT_MOVE はこの範囲にクランプする。
 * `__tests__/boardReducer.test.ts` の不変条件テストで、これらの定数から
 * 計算される視覚 bounding box が [0, VIEW_BOX_SIZE] に収まることを保証している。
 */
/** x の左端: 円の左端 (stroke 含む) が 0 以上になる最小値 */
export const UNIT_COORD_X_MIN = UNIT_RADIUS + UNIT_STROKE_HALF
/** x の右端: 円の右端 (stroke 含む) が VIEW_BOX_SIZE 以下になる最大値 */
export const UNIT_COORD_X_MAX = VIEW_BOX_SIZE - UNIT_RADIUS - UNIT_STROKE_HALF
/** y の上端: 円の上端 (stroke 含む) が 0 以上になる最小値 */
export const UNIT_COORD_Y_MIN = UNIT_RADIUS + UNIT_STROKE_HALF
/** y の下端: ラベル下端 (stroke 含む) が VIEW_BOX_SIZE 以下になる最大値 */
export const UNIT_COORD_Y_MAX =
  VIEW_BOX_SIZE -
  UNIT_RADIUS -
  UNIT_LABEL_GAP -
  UNIT_LABEL_HEIGHT -
  UNIT_LABEL_STROKE_HALF

// ---- Phase 7: 方向矢印 ----

/**
 * 方向矢印 line の始点 (円中心からの距離)。
 * コスト数値 (font 20、円中心) の表示と被らないよう、円の中央付近より外に置く。
 */
export const UNIT_DIRECTION_LINE_INNER = 14

/**
 * 方向矢印 line の終点 = 三角形 (arrow head) の付け根の中心 (円中心からの距離)。
 *
 * 不変条件 (Phase 7 計画書 §7):
 *   UNIT_DIRECTION_LINE_OUTER + UNIT_DIRECTION_ARROW_HEAD_LENGTH
 *     <= UNIT_RADIUS - UNIT_STROKE_WIDTH / 2
 * 現在値: 18 + 8 = 26 <= 30 - 1 = 29 ✅
 *
 * これを満たす限り、矢印は円本体の bounding box 内に収まり、UNIT_COORD_*_MIN/MAX
 * の安全範囲を再計算する必要がない。定数を変更したら必ずこの式を再検証すること。
 */
export const UNIT_DIRECTION_LINE_OUTER = 18

/** 三角形 (arrow head) の根元から先端までの長さ */
export const UNIT_DIRECTION_ARROW_HEAD_LENGTH = 8

/** 三角形 (arrow head) の根元の半幅 (= 線の左右に張り出す幅) */
export const UNIT_DIRECTION_ARROW_HALF_WIDTH = 5

/** 矢印 line の stroke 幅 */
export const UNIT_DIRECTION_LINE_WIDTH = 2.5

/** 矢印の塗り色。slate-50。中央コスト文字と同色で「ユニット内 UI の白系」を統一 */
export const UNIT_DIRECTION_COLOR = '#f8fafc'

// ---- Phase 7: 8 方向ピッカー ----

/**
 * ピッカー円の半径 (Issue #8 で R=74 と指定)。
 * 選択ユニット中心からこの距離に 8 個のボタンを配置する。
 */
export const UNIT_DIRECTION_PICKER_RADIUS = 74

/** 各方向ピッカーボタンの円半径 */
export const UNIT_DIRECTION_PICKER_BUTTON_RADIUS = 14

/** ピッカーボタンの塗り色 (非選択時)。半透明の濃紺で、下のグリッドが透けて見える */
export const UNIT_DIRECTION_PICKER_BUTTON_FILL = '#0f172a'

/** ピッカーボタンの塗り opacity (非選択時) */
export const UNIT_DIRECTION_PICKER_BUTTON_FILL_OPACITY = 0.7

/** ピッカーボタンの縁取り色 (非選択時)。slate-400 */
export const UNIT_DIRECTION_PICKER_BUTTON_STROKE = '#94a3b8'

/** ピッカーボタンの縁取り幅 */
export const UNIT_DIRECTION_PICKER_BUTTON_STROKE_WIDTH = 1.5

/** 現在 direction のボタンの塗り色。sky-400 */
export const UNIT_DIRECTION_PICKER_BUTTON_SELECTED_FILL = '#38bdf8'

/** 現在 direction のボタンの塗り opacity */
export const UNIT_DIRECTION_PICKER_BUTTON_SELECTED_FILL_OPACITY = 0.85

/** 現在 direction のボタンの縁取り色。slate-50 */
export const UNIT_DIRECTION_PICKER_BUTTON_SELECTED_STROKE = '#f8fafc'

/** ピッカーボタン内の小矢印 line 始点 (ボタン中心からの距離) */
export const UNIT_DIRECTION_PICKER_ARROW_INNER = 3

/** ピッカーボタン内の小矢印 line 終点 = 三角形の付け根 (ボタン中心からの距離) */
export const UNIT_DIRECTION_PICKER_ARROW_OUTER = 7

/** ピッカーボタン内の小矢印 三角形の長さ */
export const UNIT_DIRECTION_PICKER_ARROW_HEAD_LENGTH = 4

/** ピッカーボタン内の小矢印 三角形の半幅 */
export const UNIT_DIRECTION_PICKER_ARROW_HALF_WIDTH = 3

/** ピッカーボタン内の小矢印 line の stroke 幅 */
export const UNIT_DIRECTION_PICKER_ARROW_LINE_WIDTH = 1.5

/** focus 時に追加で描く focus ring の半径 (ボタン半径より少し大きい円) */
export const UNIT_DIRECTION_PICKER_FOCUS_RING_RADIUS = 17

/** focus ring の縁取り色。amber-300 (他 UI の点灯色と揃える) */
export const UNIT_DIRECTION_PICKER_FOCUS_RING_STROKE = '#fcd34d'

/** focus ring の縁取り幅 */
export const UNIT_DIRECTION_PICKER_FOCUS_RING_STROKE_WIDTH = 2
