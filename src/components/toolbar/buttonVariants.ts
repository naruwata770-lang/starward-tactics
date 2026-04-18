/**
 * Toolbar ボタンの視覚階層 variant (Issue #87)。
 *
 * なぜ階層が必要か:
 * - uxaudit iteration-2/3 で `usability/visual-hierarchy` fail が継続
 * - 全ボタンが `bg-slate-800` の同格で並び、初見ユーザーが core flow 終端
 *   (共有 / PNG 出力) を視覚的に特定できなかった
 *
 * 階層の決め方 (credo.md「Core First, Polish Later」):
 * - core flow 終端 = ShareButton (primary-strong) と ExportButton (primary-soft)
 * - 盤面編集の補助 = Undo / Redo / HP Boost (secondary)
 * - 破壊的操作 = Reset (destructive、既存の rose を維持)
 *
 * 2 段 primary (strong + soft) を採る理由:
 * - 2 つの primary を完全同格にすると視線の着地点が割れる。Share を solid、
 *   Export を outline-accent にすることで primary 群として纏まりつつ第一焦点を
 *   Share に寄せる
 *
 * HpBoost ON 時を tinted ghost にしている理由:
 * - 現行の `bg-emerald-700` 塗りつぶしは Reset / Share と並ぶと filled ボタンが
 *   3 個になり階層が崩れる。CTA 階層 (primary/destructive) と状態表示
 *   (on/off) を色の濃度で分離している
 *
 * 高さを `h-9` で揃える理由:
 * - padding 差だけで高さがばらつくと Toolbar 横並びで整列が乱れる
 *   (Gemini セカンドオピニオン反映)
 *
 * shadow ではなく border を使う理由:
 * - dark theme (`bg-slate-950` 背景) では `shadow-*` はほぼ見えず、輪郭は
 *   `border border-<color>/40` の方が立つ (Gemini 指摘)
 *
 * 配置を `src/components/toolbar/` に閉じる理由:
 * - これはテーマ定数ではなく Toolbar 専用の UI recipe。Inspector など他領域で
 *   再利用が明確になった時点で `src/components/ui/` へ昇格する
 *   (Codex セカンドオピニオン反映)
 */

const BASE =
  'cursor-pointer inline-flex items-center justify-center h-9 rounded-md text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2'

export const PRIMARY_STRONG_BUTTON = `${BASE} px-4 font-bold bg-violet-600 text-white border border-violet-400/40 hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-violet-800 disabled:opacity-40 disabled:hover:bg-violet-800`

export const PRIMARY_SOFT_BUTTON = `${BASE} px-3 font-semibold bg-violet-950/40 text-violet-200 border border-violet-500/60 hover:bg-violet-900/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-violet-950/40`

export const SECONDARY_BUTTON = `${BASE} px-3 font-semibold bg-slate-900/50 text-slate-300 border border-slate-700 hover:bg-slate-800 hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-900/50 disabled:hover:border-slate-700 disabled:hover:text-slate-300`

// disabled 系 class は現状未使用の variant にも付与しておく。variant として
// 再利用時 (たとえば将来 Reset に loading state を入れる、別ボタンを TOGGLE_ON
// に寄せる等) に自動で disabled 表示が揃うようにするため (Claude/Gemini [共通]
// レビュー指摘反映)。
export const TOGGLE_ON_BUTTON = `${BASE} px-3 font-semibold bg-emerald-950/40 text-emerald-200 border border-emerald-600 hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-emerald-950/40`

export const DESTRUCTIVE_BUTTON = `${BASE} px-3 font-bold bg-rose-900 text-rose-100 hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-rose-900`
