import { Layout } from './components/Layout'
import { Board } from './components/board/Board'
import { TeamCostBar } from './components/board/TeamCostBar'
import { InspectorPanel } from './components/inspector/InspectorPanel'
import { Toolbar } from './components/toolbar/Toolbar'
import { useUrlSync } from './hooks/useUrlSync'
import { BoardProvider } from './state/BoardProvider'
import { decode } from './state/urlCodec'
import type { BoardState } from './types/board'

/**
 * URL クエリ ?b= を **同期** で読み取って初期 state に変換する。
 *
 * useUrlSync の effect で後追い LOAD_STATE する設計だと、初回 1 フレームだけ
 * デフォルト盤面が描画されてしまう (フラッシュ)。さらに `state→URL` のデバウンス
 * effect が同時に走り、復元前の state を pending に積んでしまう race も起きる。
 *
 * BoardProvider に initialState を渡せば、最初の render から正しい state で
 * 描画され、useUrlSync は「state→URL 書き戻し + popstate」の責務だけに絞れる。
 *
 * SSR ガード: `typeof window !== 'undefined'` で念のため早期 return。
 * 不正な URL は黙って無視 (initial state で起動)。
 */
function readInitialBoardStateFromUrl(): BoardState | undefined {
  if (typeof window === 'undefined') return undefined
  const param = new URLSearchParams(window.location.search).get('b')
  if (param === null) return undefined
  return decode(param) ?? undefined
}

/**
 * URL ↔ state 同期 hook を BoardProvider の内側で呼ぶための小さな bridge。
 * useUrlSync は useBoard / useBoardDispatch に依存するため、Provider の外では
 * 呼べない。null を返すだけのレンダーレスコンポーネント。
 */
function UrlSyncBridge() {
  useUrlSync()
  return null
}

function App() {
  // 同期で URL から初期 state を構築 (初回フラッシュと race condition の根本解消)
  const initialState = readInitialBoardStateFromUrl()

  return (
    <BoardProvider initialState={initialState}>
      <UrlSyncBridge />
      <Layout
        toolbar={
          // Issue #60: TeamCostBar を Toolbar 直下に束ねて header 内に配置する。
          // Layout 側の slot を増やさず呼び出し側で構成して公開 API を安定させる
          // (セカンドオピニオン Codex[中] 反映)。
          <div className="flex flex-col gap-2">
            <Toolbar />
            <TeamCostBar />
          </div>
        }
        board={<Board />}
        inspector={<InspectorPanel />}
      />
    </BoardProvider>
  )
}

export default App
