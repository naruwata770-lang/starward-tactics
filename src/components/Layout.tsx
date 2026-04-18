/**
 * Layout: 上に Toolbar、左 (または上) に Board+CostBar、右 (または下) に InspectorPanel を
 * 配置するシェル。
 *
 * Phase 3 でスロットベースのレイアウトを導入。Phase 10 でクレジット footer を追加。
 * Issue #84 で `costBar` slot を分離 (Issue #60 で header に束ねていたものを、盤面との
 * 視線距離を縮めるため main 内の board 直下に移動)。SVG の外側なので Tailwind class を
 * 使ってよい (Phase 9 の PNG 出力対象は SVG 内のみ)。
 *
 * 受け渡し方:
 *   <Layout
 *     toolbar={<Toolbar />}
 *     board={<Board />}
 *     costBar={<TeamCostBar />}
 *     inspector={<InspectorPanel />}
 *   />
 * children ではなく名前付き slot にすることで「4 つの slot を埋める」契約を型で表現する。
 *
 * 配置ルール:
 * - board + costBar は main 内で同じ中央寄せコンテナ (`maxWidth=VIEW_BOX_SIZE`) に
 *   同居し、1 つの「盤面の読み物」ブロックとして縦に並ぶ。これにより desktop で
 *   aside (Inspector) が伸びて main が縦に広がっても board と costBar は視覚的に
 *   隣接する (Issue #84 の主目的: 盤面と残コスト表示の視線距離最短化)
 * - desktop (`lg:flex-row`): 左列 = main(board+costBar) / 右列 = aside(inspector)。
 *   costBar は board と同じ列内に留まり、aside と並列にならない
 * - narrow (`flex-col`): `header → main(board+costBar) → aside(inspector) → footer`。
 *   main 内で board と costBar がブロックとして隣接する順序は desktop と同じ
 *
 * 盤面+コストバーの配置 (main 内部):
 * - ラッパ (`flex flex-col items-center`) に `maxWidth: VIEW_BOX_SIZE` を与えて、
 *   board の 720 幅と水平方向に揃える
 * - board コンテナは `aspectRatio: 1/1` + `maxHeight: VIEW_BOX_SIZE` で正方形を
 *   維持する。SVG は既定の preserveAspectRatio (xMidYMid meet) でアスペクト比を保つ
 * - costBar は wrapper 直下に置き、`gap-2` で board との隙間を 0.5rem に固定する
 *   (視線距離を短く保ちつつ、ラベル間の息つぎを確保)
 * - main の縦整列は `items-start`。`items-center` にすると、aside (Inspector) が
 *   伸びて main が viewport より縦に広がったとき、board+costBar ブロックが中央に
 *   押し下げられ cost bar が viewport 外に落ちる。items-start で常に上端揃えにすれば
 *   board は header 直下に来て cost bar も自然に viewport 内に収まる
 *
 * aside の overflow:
 * - `overflow-y-auto` + `min-h-0` を指定して、縦狭 viewport で Inspector が
 *   内部スクロールになるようにする。`min-h-0` がないと flex 子要素が親から
 *   はみ出す。
 */

import type { ReactNode } from 'react'

import { VIEW_BOX_SIZE } from '../constants/board'

export interface LayoutProps {
  toolbar: ReactNode
  board: ReactNode
  costBar: ReactNode
  inspector: ReactNode
}

export function Layout({ toolbar, board, costBar, inspector }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-svh bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 px-4 py-2">{toolbar}</header>
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <main className="flex flex-1 min-h-0 items-start justify-center p-4">
          <div
            className="flex w-full flex-col items-center gap-2"
            style={{ maxWidth: VIEW_BOX_SIZE }}
          >
            <div
              className="w-full"
              style={{ maxHeight: VIEW_BOX_SIZE, aspectRatio: '1 / 1' }}
            >
              {board}
            </div>
            <div className="w-full">{costBar}</div>
          </div>
        </main>
        <aside className="w-full lg:w-80 min-h-0 overflow-y-auto border-t lg:border-t-0 lg:border-l border-slate-800 p-4">
          {inspector}
        </aside>
      </div>
      <footer className="border-t border-slate-800 px-4 py-2 text-center text-xs text-slate-500">
        Inspired by{' '}
        <a
          href="https://www.kuro7983.com/apps/exvs2ib-tactics-board"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-300 transition"
        >
          kuro7983
        </a>
      </footer>
    </div>
  )
}
