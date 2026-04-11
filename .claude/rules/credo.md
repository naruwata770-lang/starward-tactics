# Credo — 実装原則 4 つ

このファイルは **禁止リストではなくレビュー時の問いリスト** である。
各原則は「適用しない場面」を明示的に持つので、機械的に当てはめるのではなく `/review` や `/ask-others` で判断材料として使う。
教条化を避けるため、原則ごとに「問い / 適用しない例 / 証拠 / Positive / Negative」の 5 行にまとめる。

## 1. Core First, Polish Later

- **問い**: 「この変更で core flow (駒を置く → 編成を共有する) は何分で触れるようになるか？」
- **適用しない例**: クリティカルなバグ修正・回帰テスト追加
- **証拠**: コア操作 (`MOVE_UNIT` / URL 共有 / Undo) のテスト結果が緑
- **✅ Positive**: Phase 5 で Toolbar のアイコン装飾を後回しにして、先に URL 共有 (core flow 終端) の最小実装を通した
- **❌ Negative**: Inspector の追加属性ピッカーを 5 種類同時に増やそうとして、共有 URL のスキーマ更新が後回しになる

## 2. Wire Before You Decorate

- **問い**: 「この部品は単体ではなく vertical slice として通っているか？」
- **適用しない例**: 純粋なリファクタ・コメント整備
- **証拠**: 品質ゲート (lint / typecheck / test / build) 全通過 + `npm run dev` でその機能が end-to-end で動く
- **✅ Positive**: Phase 4 で InspectorPanel を作った時、CoreType / Cost / LockTarget を Provider 経由で reducer まで配線してから見た目を整えた
- **❌ Negative**: StarburstGauge の見た目だけ作って、選択 unit 変更時の再描画ロジックを後回しにする

## 3. No Dead Code

- **問い**: 「これは動かないコード／使われない export を残していないか？」
- **適用しない例**: なし (常に問う)
- **証拠**: `npm run lint && npm run typecheck && npm run test && npm run build` 全通過 + 手動で機能を一度触る
- **✅ Positive**: レビューで指摘された不要な後方互換シムを次コミットで削除した (Phase 5 履歴)
- **❌ Negative**: Phase 5 の Toolbar に「将来用」の `SettingButton` を `disabled` で残す

## 4. Spec is the default, but user evidence overrides spec

- **問い**: 「`.tmp/<phaseN>-plan.md` または `.tmp/<issue番号>-<topic>-plan.md` の検証シナリオを満たしているか？ 満たしているのに UX が悪い場合、シナリオの方を更新する用意はあるか？」
- **適用しない例**: シナリオに明示されたエッジケースを優先する場合
- **証拠**: シナリオと手動触り (後続 Issue #18 γ1 で導入予定の uxaudit があれば併用) の結果が一致
- **✅ Positive**: Phase 5 レビューで race condition を発見し、シナリオを「popstate で pending デバウンスが cancel される」に更新してから直した
- **❌ Negative**: 「シナリオには書いてないから対応しない」と AI が判断する

## 削除した原則

- **Built to Grow** (退屈で読みやすいコード優先) → 削除。理由: 個人開発では抽象議論を呼びやすく、同方向のニュアンスは `code-conventions.md` (責務分離・定数集約・後方互換シム禁止) で既にカバーされているため重複する。
