/**
 * Board: VIEW_BOX_SIZE の SVG 盤面ルート。
 *
 * Phase 3 では <defs> + 背景 + ユニット 4 機の静的描画のみ。
 * インタラクション (ドラッグ、選択) は Phase 4 以降で追加する。
 *
 * 重要: この <svg> 内では Tailwind class を使わず、すべて属性で色を指定する。
 * Phase 9 の PNG 出力で外部 CSS が解決されない問題を避けるため。
 *
 * アクセシビリティ: <svg> ルートには role="img" + aria-label を指定し、
 * 支援技術には「戦術ボード」として認識させる。<title> をルートに置くと
 * 盤面全体の hover でツールチップが出てしまうので、盤面ルートには付けず、
 * 個々のユニット (UnitToken の <g><title> ... </title>) に持たせている。
 *
 * z-order: UNIT_IDS の並び順がそのまま描画順 (後勝ち) になる。
 * `self → ally → enemy1 → enemy2` の順なので enemy2 が最前面に描かれる。
 * Phase 4 以降で「選択中ユニットを最前面にしたい」等の要件が出た場合は
 * ここのソート順を調整する。
 *
 * overflow="visible" を付ける理由 (Phase 7):
 * SVG 仕様の overflow デフォルトは「viewport 境界で clip」(CSS とは違って
 * visible ではない) なので、明示しないと viewBox 720x720 の外側にある描画は
 * 視覚的に消える。Phase 7 で導入した DirectionPicker は選択ユニットが盤面端
 * (UNIT_COORD_*_MAX 近傍) にいる時、ピッカー半径 R=74 のボタンが viewBox 外に
 * はみ出すので、明示的に visible にしておかないとボタンが画面に出ない。
 * 親 Layout 側のコンテナは max-w/max-h で SVG 自体の表示矩形を制限している
 * だけで、SVG 内描画の clip には影響しない。
 */

import { VIEW_BOX_SIZE } from '../../constants/board'
import { UNIT_IDS } from '../../constants/game'
import { useBoard } from '../../state/BoardContext'
import { DirectionPicker } from './DirectionPicker'
import { GridBackground } from './GridBackground'
import { LockLines } from './LockLines'
import { SvgDefs } from './SvgDefs'
import { UnitToken } from './UnitToken'

export function Board() {
  const board = useBoard()

  return (
    <svg
      viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      overflow="visible"
      role="img"
      aria-label="戦術ボード"
    >
      <SvgDefs />
      <GridBackground />
      {/* Phase 8: ロック線はユニットより下のレイヤーに描画し、トークンを覆わない */}
      <LockLines />
      {UNIT_IDS.map((id) => (
        <UnitToken key={id} unit={board.units[id]} />
      ))}
      {/*
        DirectionPicker (Phase 7) は UnitToken 群より **後** に描画する。
        SVG の z-order は後勝ちなので、ピッカーが必ず最前面に来る。
        最外 <g> は data-no-export="true" を持ち、Phase 9 PNG 出力時に
        cloneNode 後の subtree から除外される (DirectionPicker.tsx の冒頭参照)。
      */}
      <DirectionPicker />
    </svg>
  )
}
