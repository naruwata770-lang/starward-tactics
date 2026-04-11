# コード規約

## コメントは「なぜ」を書く

「何を」しているかは diff とコードを読めば分かる。コメントには **「なぜそうしたか」「なぜそうしないか」** を残す。

例 (`src/state/BoardContext.ts` 冒頭):

> Context を 4 つに分割している意図: 各 Context の value 参照が変化したときだけ、その Context を購読しているコンポーネントが再 render される。よって用途別に Context を分けることで...

「何をしているか」だけのコメント (`// state を更新する` など) は書かない。

## 定数集約

マジックナンバー / マジックストリングは避けて定数化する。集約先は意味で分ける:

- **盤面の見た目・座標系** → `src/constants/board.ts`
  - 例: `VIEW_BOX_SIZE`, `GRID_SIZE`, `UNIT_RADIUS`, `UNIT_STROKE_WIDTH`
  - SVG 描画と座標クランプ (boardReducer) で共有する値
- **ゲーム概念** → `src/constants/game.ts`
  - 例: `UNIT_IDS`, `COSTS`, `STARBURST_LEVELS`, `CORE_TYPE_BY_ID`, `DEFAULT_POSITIONS`, `INITIAL_BOARD_STATE`
  - 色・コスト・コア種別など、ゲームのドメイン定数

複数ファイルで同じ値がハードコードされていたら集約候補。

## 責務分離の目安

- 1 関数 1 責務
- ネスト 3 段以内
- 関数 50 行以内

これらは目安。超えるなら分割を検討する (絶対ルールではない)。

## 後方互換シム / 廃止コメントを残さない

- 削除すべきコードは **完全に削除** する
- `// removed` `// 旧実装` のようなコメントは残さない
- 不要になった `_var` のリネームや、使われない型の re-export も残さない
- 「削除した経緯は git log で追える」が原則

## SVG 内の色指定

`src/components/board/` 配下の SVG コンポーネントでは、色は **`fill` / `stroke` 属性で指定** する。Tailwind class を使わない。

理由: Phase 9 (PNG 出力) で `XMLSerializer` → Canvas 変換するときに、外部 CSS (Tailwind) が解決されない。属性値で持っておけば PNG 化が単純になる。

詳細は `src/components/board/UnitToken.tsx` 冒頭コメント参照。
