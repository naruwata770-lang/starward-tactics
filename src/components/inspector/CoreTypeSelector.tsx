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
 *
 * `aria-label` を付けない理由 (#27 review で議論):
 * - First Rule of ARIA Use (https://www.w3.org/TR/using-aria/#rule1) に従い、
 *   可視テキストがそのまま accessible name になる方式を採る。「格闘 (F)」を
 *   `aria-label` で固定する案も挙がったが、視覚と読み上げが一致した方が
 *   ユーザー間の体験が揃う (晴眼者と SR ユーザーが同じ言葉でラベルを呼べる)。
 * - 子の <span> を分割してもブラウザの accessible name 計算は flex/block 配下の
 *   子テキストを空白区切りで連結するため (Chromium / Firefox で確認済み)、
 *   読み上げは「F 格闘」になる。連結区切りを保証するため flex-col の二段組で
 *   構造的に分けてある。
 *
 * 文字サイズ `text-[10px]` の理由:
 * - 「カバーリング」(6 文字) を `lg:w-80` (320px) - p-4 (32px) - gap-2 (16px) を
 *   3 列で割った 1 列 ~80px に、px-2 内側パディング込みで wrap させずに収める
 *   ための実測値。`text-xs` (12px) では「カバーリング」が改行され、`leading-none`
 *   と相まってカードの縦幅が崩れる。`whitespace-nowrap` を併用しているのは
 *   font 差で wrap が起きた場合の保険。
 * - これは CoreTypeSelector ローカルの調整で、他で再利用する予定がないため
 *   constants 化はしない。複数箇所で要るようになったら theme.extend.fontSize へ。
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
            className={`flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md px-2 py-2 text-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 focus-visible:outline-offset-2 ${
              isSelected
                ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{ backgroundColor: color }}
          >
            <span className="text-sm font-bold leading-none">{id}</span>
            <span className="whitespace-nowrap text-[10px] font-semibold leading-none">
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
})
