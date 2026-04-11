# uxaudit (gotalab/uxaudit) — インストール手順と実行メモ

[gotalab/uxaudit](https://github.com/gotalab/uxaudit) を Claude Code Plugin として導入し、
`npm run preview` で起動した SPA を対象に UX 回帰テストを走らせる。Issue #18 の spike で
手順を検証済み。

> ℹ️ このプロジェクトは Phase 5 時点のスナップショットを **iteration-1** ベースラインに
> している (`docs/uxaudit/iteration-1/`)。イテレーション命名規約はこのファイル末尾を参照。

## 前提

| 要件 | 備考 |
|---|---|
| Claude Code CLI | plugin marketplace をサポートするバージョン (2.1 以降で確認済み) |
| Node.js 20+ | 本プロジェクトは `.nvmrc` で固定 |
| Python 3.10+ | uxaudit 内部スクリプトが使用 |
| 空き容量 ~300 MB | 初回実行で Playwright Chromium が自動 DL される |
| `npm run preview` が起動可能 | 監査対象 SPA (デフォルト `http://localhost:4173`) |

## インストール手順 (検証済み)

Claude Code 起動前に、OS シェルから以下を実行する:

```bash
# 1. マーケットプレイス追加
claude plugin marketplace add gotalab/uxaudit

# 2. プラグイン本体を user スコープでインストール
claude plugin install uxaudit@gotalab-uxaudit

# 3. インストール状態を確認 (uxaudit@gotalab-uxaudit が ✔ enabled で出ればOK)
claude plugin list
```

既に Claude Code セッションを走らせている場合は、代わりにセッション内で次を実行しても良い:

```text
/plugin marketplace add gotalab/uxaudit
/plugin install uxaudit@gotalab-uxaudit
```

### ⚠️ セッション途中でインストールした場合の注意

`claude plugin install` でインストールしても、**すでに起動している Claude Code セッションには
`/uxaudit:uxaudit` スラッシュコマンドとサブエージェント (`uxaudit-scout` など) は load されない**。
Claude Code は plugin のスキル / エージェントをセッション開始時にだけ読み込むため、以下のいずれかが必要:

1. **Claude Code を再起動** してから `/uxaudit:uxaudit` を叩く (推奨)
2. 代替として `.claude/rules/ux-review.md` の AI レビュー fallback に切り替える

Issue #18 の spike では 2 の fallback を採用して iteration-1 ベースラインを確保した。
**新しく Claude Code を起動し直してから 1 を走らせる方が、自動化された完全なベースラインが得られる**。

## 実行 (slash command)

Claude Code を再起動後、対象 SPA を `npm run preview` で起動した状態で:

```text
/uxaudit:uxaudit tacticsboard --lang ja
```

必要に応じてフラグを追加:

- `--url http://localhost:4173` — auto-detect が外れるときに明示
- `--viewport desktop` — 既定は Scout 推定 / `desktop`
- `--yes` — 無人モード (dev-server disambiguation の確認プロンプトを自動解決)
- `--scenario-mode locked` — 2 回目以降、同じジャーニー契約で回帰比較したいとき

成果物は uxaudit が `iteration-N/` ディレクトリ構造で書き出す。SKILL.md 側のパス解決で
`$UXAUDIT_DIR/...` に evidence / result.json / benchmark.json が置かれる。

## iteration 命名規約 (本プロジェクト)

- ベースライン + 監査結果は **`docs/uxaudit/iteration-<N>/`** に保存する
  - `.tmp/` ではなく `docs/` 配下にする理由: `.tmp/` は `.gitignore` で履歴が残らない
- 最初のイテレーションは `iteration-1`。Phase 5 完了時点のスナップショット
- 各 iteration 配下:
  - `summary.md` — 人間が読む要約 (必ず git 管理)
  - `manual-ai.md` — AI レビュー fallback 使用時の生ログ (git 管理)
  - (将来) `benchmark.json` / `dashboard.html` / `evidence/` — uxaudit 自動実行時のアウトプット
- スクショ原本が重い場合 (>5MB/iter 目安) は `.gitignore` で除外し、
  `summary.md` に「原本はローカル `docs/uxaudit/iteration-N/evidence/` にある」旨を注記する

## 4 失敗パターン (判定軸)

uxaudit の band / subtype とは別に、本プロジェクトでは次の 4 軸で高レベル判定を記録する
(`docs/uxaudit/iteration-N/summary.md` 冒頭に必ず入れる):

| パターン | 内容 |
|---|---|
| 伝わらない | 画面を見たとき、何のアプリか・何を操作しているかが読み取れない |
| ぼやける | スクショだけでは「大事な要素」と「装飾」の優先順位が付かない |
| 見つからない | 欲しい機能・次に押すべきボタンが画面上で見つけられない |
| 始まらない | 起動直後にアクションが詰まり、最初のユーザー価値に届かない |

この 4 軸は Credo (`#19 α`) の 4 原則と対応させて運用統合する想定だが、spike 段階
(#18) では独立した judgment レイヤーとして記録するだけに留める。運用統合は γ2 で後追いする。

## フォローアップ

- **ベースラインの「重要度: 高」項目を実 UX 改善として別 Issue 起票**
  - Phase ではなく UX 改善ラベルで切る
- **`/ask-others` で計画書レビューしてから大きめ変更に着手** (計画フロー自体は変更なし)
- **運用統合 (γ2)**: `CLAUDE.md` / `git-workflow.md` に uxaudit 運用手順を後追いで追記する Issue
