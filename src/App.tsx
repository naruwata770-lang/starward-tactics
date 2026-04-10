import { Layout } from './components/Layout'
import { Board } from './components/board/Board'
import { BoardProvider } from './state/BoardProvider'

// Phase 3 ではまだ Toolbar / InspectorPanel の中身を作らない。
// 後続フェーズで実装するまでの仮プレースホルダ。
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
