import { BoardProvider } from './state/BoardProvider'

function App() {
  return (
    <BoardProvider>
      <div className="flex items-center justify-center min-h-svh">
        <h1 className="text-2xl font-bold text-slate-200">星の翼 戦術ボード</h1>
      </div>
    </BoardProvider>
  )
}

export default App
