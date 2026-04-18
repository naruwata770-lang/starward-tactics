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
 * なぜ square wrapper を廃して board+costBar を 1 つの中央寄せコンテナに束ねたか:
 * - 計画書 (drafts/84-...-plan.md) の当初案は「main 内の square wrapper の外」に
 *   cost bar を独立行として置く構成だった。しかし実装時、desktop で aside (Inspector)
 *   が縦に伸びた場合に main も flex-row の stretch で縦に広がり、board だけが
 *   square wrapper 内で中央寄せされて cost bar が遠ざかる副作用が発生した
 * - 代わりに main の中央寄せコンテナで board と costBar を flex-col + gap-2 で
 *   並べると、両者が常に同一ブロックとして隣接し、主目的 (視線距離最短化) が
 *   aside の伸縮に依らず保たれる
 *
 * 盤面+コストバーの配置 (main 内部):
 * - ラッパ (`flex flex-col`) に `maxWidth: VIEW_BOX_SIZE` + `h-full` を与えて、
 *   board の 720 幅と水平方向に揃えつつ main の高さに追従する
 * - board コンテナは `w-full flex-1 min-h-0` + `maxHeight: VIEW_BOX_SIZE`。SVG 自身が
 *   `width=100% height=100%` + 既定の preserveAspectRatio (xMidYMid meet) を持ち、
 *   コンテナ内でアスペクト比を保って中央描画される。height を固定せず `flex-1` で
 *   main の残り高さに追従させることで、短い viewport (縦が低い desktop / landscape
 *   / narrow の aside 展開時) でも盤面が main を縦にはみ出さず、costBar が確実に
 *   main 内に残る (Codex[中] レビュー指摘反映)
 * - costBar は wrapper 下部に `flex-none` + `w-full` で置き、board との隙間は
 *   `gap-2` (0.5rem)。cost bar 自身の SVG が `height=72` 固定なので縮まない
 *
 * main の縦整列 (items-start を採る理由):
 * - aside (Inspector) が伸びて main が viewport より縦に広がったとき、items-center
 *   だと board+costBar ブロックが中央に押し下げられ cost bar が viewport 外に落ちる
 * - items-start で常に上端揃えにすれば board は header 直下に来て cost bar も
 *   自然に viewport 内に収まる
 * - 副作用: tall viewport (Inspector が短く main が縦に余る場合) に board+costBar が
 *   上寄せで下部に空白が出る。これは「cost bar が viewport 外に落ちる」重い副作用
 *   より軽微 (情報損失ではなく視覚的違和感のみ) と判断して受容した
 *
 * outer の高さ戦略 (`min-h-svh lg:h-svh`、Issue #86):
 * - `lg` 未満 (1 カラム: flex-col) では `min-h-svh` のまま運用し、aside が main
 *   の下に来る narrow レイアウトで **page-level scroll** を使って Inspector 全体に
 *   到達する。これはモバイル / タブレット縦持ちでの自然なドキュメント型 UX
 * - `lg` 以上 (2 カラム: flex-row) では outer を `h-svh` に固定して
 *   **aside (Inspector) だけを内部スクロール** させる。これにより短い viewport
 *   (landscape desktop / 1440×600 など) で aside が tall でも main の board+costBar
 *   は viewport 内に残る (Issue #84 主目的「視線距離最短化」を short viewport まで
 *   拡張)
 * - `lg` 境界は偶然ではなく `flex-col lg:flex-row` のレイアウト切替と 1:1 対応して
 *   いる。2 カラム時だけ高さ拘束が必要という本来の要件と合致する
 * - あえて root に `overflow-hidden` は載せない: content growth は `h-svh` +
 *   内部の `flex-1 min-h-0` で既に止まる想定で、防御 overflow を足すと Board 側
 *   SVG の `overflow="visible"` (DirectionPicker を盤面外に描く) との層が違っても
 *   clipping 回帰リスクが残る。必要性が実測で確認された時点で初めて足す方針
 *   (No Dead Code)
 *
 * aside の overflow:
 * - `overflow-y-auto` + `min-h-0` を指定して、2 カラム (`lg` 以上) で outer が
 *   `h-svh` に縛られたとき Inspector が内部スクロールになるようにする。
 *   `min-h-0` がないと flex 子要素が親からはみ出す。
 * - 1 カラム期 (`lg` 未満) は outer が `min-h-svh` のままなので aside は content
 *   高さまで自然に伸び、`overflow-y-auto` は発火せず page-level scroll に任せる
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
    <div className="flex flex-col min-h-svh lg:h-svh bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 px-4 py-2">{toolbar}</header>
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <main className="flex flex-1 min-h-0 items-start justify-center p-4">
          <div
            className="flex w-full h-full flex-col gap-2"
            style={{ maxWidth: VIEW_BOX_SIZE }}
          >
            <div
              className="w-full flex-1 min-h-0"
              style={{ maxHeight: VIEW_BOX_SIZE }}
            >
              {board}
            </div>
            <div className="w-full flex-none">{costBar}</div>
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
