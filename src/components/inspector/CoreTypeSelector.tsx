/**
 * CoreTypeSelector: コア種別 (F/S/M/D/B/C) を選ぶ。
 *
 * 各ボタンは CORE_TYPES のメタデータの色を背景に使い、コアの色を一目で
 * 認識できるようにする。
 *
 * ラベル併記の意図: 1 文字 id (F/S/M/D/B/C) は原作プレイヤーには馴染みがあるが、
 * 初見ユーザーは F=格闘 / S=射撃 などを知らない (#27 で iteration-1 の「伝わらない」
 * 失敗として高で挙がった)。title 属性 (hover tooltip) ではタッチ環境やキーボード
 * 操作で発見できないため、各ボタン内に補助ラベルを常時表示する。
 *
 * ARIA: toggle button group として `aria-pressed` 方式で表現する。他セレクタ
 * (UnitSelector / CostSelector 等) と一貫させるため `role="radio"` は使わない。
 * ボタンの可視テキストが「F 格闘」のように id + 補助ラベルになるので、
 * スクリーンリーダーには両方読み上げられる (`aria-label` を別途付けない)。
 *
 * memo 化: 親 InspectorPanel の再 render に引きずられないよう、props のシャロー比較で bailout する。
 */

import { memo } from 'react'

import { CORE_TYPES } from '../../constants/game'
import { useBoardDispatch } from '../../state/BoardContext'
import type { CoreType, UnitId } from '../../types/board'

export interface CoreTypeSelectorProps {
  unitId: UnitId
  current: CoreType
}

export const CoreTypeSelector = memo(function CoreTypeSelector({
  unitId,
  current,
}: CoreTypeSelectorProps) {
  const dispatch = useBoardDispatch()

  return (
    <div
      role="group"
      aria-label="コア種別"
      className="grid grid-cols-3 gap-2"
    >
      {CORE_TYPES.map(({ id, label, color }) => {
        const isSelected = current === id
        return (
          <button
            key={id}
            type="button"
            aria-pressed={isSelected}
            onClick={() =>
              dispatch({ type: 'SET_CORE_TYPE', unitId, coreType: id })
            }
            // text-black を使う理由: S 青 / C 紫 / その他ユニット色も含め、全コア色で
            // AA 4.5:1 を余裕をもってクリアするため (UnitSelector と同じ方針)。
            className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-2 text-black transition ${
              isSelected
                ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{ backgroundColor: color }}
          >
            <span className="text-sm font-bold leading-none">{id}</span>
            <span className="text-[10px] font-semibold leading-none">
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
})
