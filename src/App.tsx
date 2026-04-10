import { Layout } from './components/Layout'
import { Board } from './components/board/Board'
import { InspectorPanel } from './components/inspector/InspectorPanel'
import { BoardProvider } from './state/BoardProvider'

// TODO(Phase 5): Toolbar の本実装 (Undo/Redo, Reset, 共有 URL など) に置き換える。
function ToolbarPlaceholder() {
  return <h1 className="text-lg font-bold">星の翼 戦術ボード</h1>
}

function App() {
  return (
    <BoardProvider>
      <Layout
        toolbar={<ToolbarPlaceholder />}
        board={<Board />}
        inspector={<InspectorPanel />}
      />
    </BoardProvider>
  )
}

export default App
