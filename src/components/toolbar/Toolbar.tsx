/**
 * Toolbar: タイトルと操作ボタンを並べるヘッダー。
 *
 * Phase 5 で従来の `ToolbarPlaceholder` を置き換え。
 * Phase 10 で ShareButton を追加: URL バーの自動更新だけでは非自明なため、
 * 明示的なコピーボタンを追加して共有操作を発見しやすくした。
 */

import { ExportButton } from './ExportButton'
import { RedoButton } from './RedoButton'
import { ResetButton } from './ResetButton'
import { ShareButton } from './ShareButton'
import { UndoButton } from './UndoButton'

export function Toolbar() {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-lg font-bold">星の翼 戦術ボード</h1>
      <div className="flex items-center gap-2">
        <UndoButton />
        <RedoButton />
        <ResetButton />
        <ShareButton />
        <ExportButton />
      </div>
    </div>
  )
}
