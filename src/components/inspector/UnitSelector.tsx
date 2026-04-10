/**
 * UnitSelector: 4 色ボタンで編集対象ユニットを切り替える。
 *
 * Phase 6 でドラッグ＆ドロップ + 盤面クリック選択を入れるまでは、
 * これがユニット選択の唯一の入口。それ以降も「ボード上で見にくいときの
 * フォールバック」として残す想定。
 *
 * 各ボタンは UNIT_COLORS の色をそのまま背景にする。選択中はリングで強調する。
 */

import { UNIT_COLORS, UNIT_IDS, UNIT_LABELS } from '../../constants/game'
import { useSelection } from '../../state/BoardContext'

export function UnitSelector() {
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
            className={`flex-1 rounded-md px-2 py-2 text-xs font-bold text-slate-900 transition ${
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
}
