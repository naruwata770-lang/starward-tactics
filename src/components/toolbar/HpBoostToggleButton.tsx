/**
 * HpBoostToggleButton: 盤面トークンの HP/Boost 表示をトグル切替する (Issue #58)。
 *
 * 設計判断:
 * - 表示状態は UIContext (showHpBoost) で管理。localStorage で永続化されている
 *   ので「再ロードしても撮影モードを維持」を狙える
 * - aria-pressed で現在状態を支援技術に伝える (他のセレクタ系と表現を揃える)
 * - 「Quiz Mode」案を見送って「HP/Boost」と直接ラベルにしているのは、
 *   実態が「情報密度の調整」でゲームモードではないため
 * - Toolbar 直置きにしているのは、撮影前に頻繁に切り替える操作だから
 *   (Inspector や設定メニュー配下に隠すと発見されない; Codex/Gemini[共通] 反映)
 */

import { useShowHpBoost } from '../../state/BoardContext'

export function HpBoostToggleButton() {
  const { showHpBoost, setShowHpBoost } = useShowHpBoost()
  const label = showHpBoost ? 'HP/Boost ON' : 'HP/Boost OFF'

  return (
    <button
      type="button"
      onClick={() => setShowHpBoost(!showHpBoost)}
      aria-pressed={showHpBoost}
      aria-label={`HP/Boost 表示を${showHpBoost ? '隠す' : '表示する'}`}
      className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2 ${
        showHpBoost
          ? 'bg-emerald-700 text-emerald-50 hover:bg-emerald-600'
          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
      }`}
    >
      {label}
    </button>
  )
}
