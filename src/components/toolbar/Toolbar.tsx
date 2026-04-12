/**
 * Toolbar: タイトルと最小限の操作ボタン (Undo / Redo / Reset) を並べる。
 *
 * Phase 5 で従来の `ToolbarPlaceholder` を置き換える。
 *
 * URL 共有機能は Toolbar に UI を持たない: state 変更時に自動で `?b=` が
 * 更新されるので、ユーザーは「現在の URL をコピー」するだけで共有できる。
 * 「共有 URL を生成」ボタンを置く案もあるが、URL バーの状態がそのまま正解
 * なので明示ボタンは不要。Phase 5 では追加しない。
 */

import { ExportButton } from './ExportButton'
import { RedoButton } from './RedoButton'
import { ResetButton } from './ResetButton'
import { UndoButton } from './UndoButton'

export function Toolbar() {
  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-lg font-bold">星の翼 戦術ボード</h1>
      <div className="flex items-center gap-2">
        <UndoButton />
        <RedoButton />
        <ResetButton />
        <ExportButton />
      </div>
    </div>
  )
}
