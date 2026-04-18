/**
 * Toolbar: タイトルと操作ボタンを並べるヘッダー。
 *
 * Phase 5 で従来の `ToolbarPlaceholder` を置き換え。
 * Phase 10 で ShareButton を追加: URL バーの自動更新だけでは非自明なため、
 * 明示的なコピーボタンを追加して共有操作を発見しやすくした。
 *
 * Issue #60 で TeamCostBar を呼び出し側の <div flex-col> で一時的に束ねて
 * ヘッダー内に配置していたが、Issue #84 で Layout の `costBar` slot に分離し
 * Toolbar 自体は操作 UI 専任に戻した (盤面と残コスト表示の視線距離最短化のため)。
 * 今後「残コスト表示を Toolbar に足したい」系の提案は、Layout.tsx の JSDoc に
 * ある配置根拠 (Issue #84) を読んでから再検討すること。
 */

import { ExportButton } from './ExportButton'
import { HpBoostToggleButton } from './HpBoostToggleButton'
import { RedoButton } from './RedoButton'
import { ResetButton } from './ResetButton'
import { ShareButton } from './ShareButton'
import { UndoButton } from './UndoButton'

export function Toolbar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-lg font-bold">星の翼 戦術ボード</h1>
      <div className="flex flex-wrap items-center gap-2">
        <UndoButton />
        <RedoButton />
        <ResetButton />
        {/* Issue #58: 表示密度の調整。撮影前に頻繁に切替できるよう Toolbar 直置き */}
        <HpBoostToggleButton />
        <ShareButton />
        <ExportButton />
      </div>
    </div>
  )
}
