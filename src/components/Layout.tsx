/**
 * Layout: 上に Toolbar、左に Board、右に InspectorPanel を配置するシェル。
 *
 * Phase 3 ではスロットだけ提供し、子要素として渡される 3 コンポーネントを並べる。
 * SVG の外側なので Tailwind class を使ってよい (Phase 9 の PNG 出力対象は SVG 内のみ)。
 *
 * 受け渡し方:
 *   <Layout toolbar={<Toolbar />} board={<Board />} inspector={<InspectorPanel />} />
 * children ではなく名前付き slot にすることで「3 つの slot を埋める」契約を型で表現する。
 *
 * 盤面のサイズ決め:
 * - 親 main は flex で残り領域を埋める。`min-h-0` を入れて flex 子要素が
 *   親より大きくなったら縮められるようにする (これがないと縦狭横長の画面で
 *   盤面が aside と干渉する)。
 * - 盤面コンテナは max-w/max-h を VIEW_BOX_SIZE にした矩形。SVG 自体は
 *   `width="100%" height="100%"` でこの矩形をそのまま埋めるが、内部の
 *   viewBox 描画は既定の preserveAspectRatio (xMidYMid meet) によって
 *   アスペクト比を保ったまま中央配置される。結果として描画は常に正方形に
 *   見えるので、コンテナ側に aspect-square を付ける必要はない。
 */

import type { ReactNode } from 'react'

import { VIEW_BOX_SIZE } from '../constants/board'

export interface LayoutProps {
  toolbar: ReactNode
  board: ReactNode
  inspector: ReactNode
}

export function Layout({ toolbar, board, inspector }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-svh bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 px-4 py-2">{toolbar}</header>
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <main className="flex flex-1 min-h-0 items-center justify-center p-4">
          <div
            className="w-full h-full"
            style={{ maxWidth: VIEW_BOX_SIZE, maxHeight: VIEW_BOX_SIZE }}
          >
            {board}
          </div>
        </main>
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 p-4">
          {inspector}
        </aside>
      </div>
    </div>
  )
}
