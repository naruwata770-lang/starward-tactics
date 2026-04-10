import { Layout } from './components/Layout'
import { Board } from './components/board/Board'
import { InspectorPanel } from './components/inspector/InspectorPanel'
import { Toolbar } from './components/toolbar/Toolbar'
import { useUrlSync } from './hooks/useUrlSync'
import { BoardProvider } from './state/BoardProvider'

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
  return (
    <BoardProvider>
      <UrlSyncBridge />
      <Layout
        toolbar={<Toolbar />}
        board={<Board />}
        inspector={<InspectorPanel />}
      />
    </BoardProvider>
  )
}

export default App
