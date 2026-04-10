/**
 * Layout: 上に Toolbar、左に Board、右に InspectorPanel を配置するシェル。
 *
 * Phase 3 ではスロットだけ提供し、子要素として渡される 3 コンポーネントを並べる。
 * SVG の外側なので Tailwind class を使ってよい（Phase 9 の PNG 出力対象は SVG 内のみ）。
 *
 * 受け渡し方:
 *   <Layout toolbar={<Toolbar />} board={<Board />} inspector={<InspectorPanel />} />
 * children ではなく名前付き slot にすることで「3 つの slot を埋める」契約を型で表現する。
 */

import type { ReactNode } from 'react'

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
        <main className="flex-1 flex items-center justify-center p-4">
          {/* aspect-square で 720x720 の比率を維持しつつ親に収まるサイズにする */}
          <div className="w-full max-w-[720px] aspect-square">{board}</div>
        </main>
        <aside className="w-full lg:w-80 lg:border-l border-t lg:border-t-0 border-slate-800 p-4">
          {inspector}
        </aside>
      </div>
    </div>
  )
}
