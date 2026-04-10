import { Layout } from './components/Layout'
import { Board } from './components/board/Board'
import { BoardProvider } from './state/BoardProvider'

// TODO(Phase 4): Toolbar / InspectorPanel の本実装に置き換える。
// Phase 3 ではまだ中身を作らないので、ここで仮のプレースホルダを定義している。
function ToolbarPlaceholder() {
  return <h1 className="text-lg font-bold">星の翼 戦術ボード</h1>
}

function InspectorPlaceholder() {
  return <p className="text-sm text-slate-400">ユニットを選択してください</p>
}

function App() {
  return (
    <BoardProvider>
      <Layout
        toolbar={<ToolbarPlaceholder />}
        board={<Board />}
        inspector={<InspectorPlaceholder />}
      />
    </BoardProvider>
  )
}

export default App
