/**
 * UnitSelector: 4 色ボタンで編集対象ユニットを切り替える。
 *
 * Phase 6 でドラッグ＆ドロップ + 盤面クリック選択を入れるまでは、
 * これがユニット選択の唯一の入口。それ以降も「ボード上で見にくいときの
 * フォールバック」として残す想定。
 *
 * 各ボタンは UNIT_COLORS の色をそのまま背景にする。選択中はリングで強調する。
 *
 * memo 化の理由: InspectorPanel の再 render (Phase 6 の MOVE_UNIT で毎フレーム発火予定)
 * が連鎖しないよう、子セレクタは全て memo 化している。props なしだが、親が
 * 同じ JSX で渡す限り memo はスキップ判定に回る。
 */

import { memo } from 'react'

import { UNIT_COLORS, UNIT_IDS, UNIT_LABELS } from '../../constants/game'
import { useSelection } from '../../state/BoardContext'

export const UnitSelector = memo(function UnitSelector() {
  const { selectedUnit, setSelectedUnit } = useSelection()

  return (
    <div className="flex gap-2">
      {UNIT_IDS.map((id) => {
        const isSelected = selectedUnit === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => setSelectedUnit(id)}
            aria-pressed={isSelected}
            // text-black を使う理由:
            // ally (#2563eb blue-600) は slate-900 文字だと AA 4.5:1 を割る (3.89)。
            // 純粋黒だと全ユニットカラーで 4.6+ をクリアするのでこれで統一する。
            className={`flex-1 cursor-pointer rounded-md px-2 py-2 text-xs font-bold text-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2 ${
              isSelected
                ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{ backgroundColor: UNIT_COLORS[id] }}
          >
            {UNIT_LABELS[id]}
          </button>
        )
      })}
    </div>
  )
})
