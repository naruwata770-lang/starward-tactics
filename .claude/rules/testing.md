# テスト方針

## 配置: `src/__tests__/` に統一

テストはコロケーションせず、すべて `src/__tests__/` 配下に集約する。

理由: テスト対象を一覧できる、本体ファイルツリーがノイズなくシンプルに保てる。

ファイル名は対象に合わせる: `boardReducer.test.ts`, `Toolbar.test.tsx` など。

## 環境の使い分け

- **pure logic** (reducer, codec, history など) → node 環境
- **React コンポーネント** → happy-dom + `@testing-library/react`

`vite.config.ts` で `environment: 'happy-dom'` を既定にしているが、pure logic は happy-dom でも動くのでそのままでよい。

## グローバルスタブは `vi.stubGlobal` を使う

`window.confirm` のようなグローバルをモックするときは **必ず `vi.stubGlobal`** を使い、`afterEach` で `vi.unstubAllGlobals()` する。

```ts
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('...', () => {
  vi.stubGlobal('confirm', vi.fn(() => true))
  // ...
})
```

**禁止**: `window.confirm = vi.fn()` の直接代入。テスト間で stub が漏れて順序依存の失敗を引き起こす。Phase 5 のレビューで実際にハマったパターン。

## UI ボタンの検証パターン: BoardProvider + Probe

ボタン UI の正しさは「**クリック → 正しい action が dispatch される → state が変わる**」を検証する。

`BoardProvider` でラップし、内部に Probe コンポーネントを置いて state を `data-testid` で観測する。

```tsx
function Probe() {
  const board = useBoard()
  return <span data-testid="self-cost">{String(board.units.self.cost)}</span>
}

render(
  <BoardProvider>
    <ResetButton />
    <Probe />
  </BoardProvider>,
)
// クリック → state を Probe 経由で検証
```

実例は `src/__tests__/Toolbar.test.tsx` を参照。Phase 4 で確立して以降このパターンを踏襲している。

`Probe` コンポーネントは **使用するテストファイル内でローカル定義** する (本体の `src/components/` には置かない)。テスト専用の検証用部品なので、本体ツリーを汚染しないため。

## ボタン取得ヘルパー

`disabled` プロパティを型安全に読みたいときは `HTMLButtonElement` にキャストするヘルパーを各テストファイルに用意する (`Toolbar.test.tsx` の `getButton` 参照)。
