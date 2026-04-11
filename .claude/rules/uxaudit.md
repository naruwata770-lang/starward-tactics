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

> 🧪 セッション内のスラッシュコマンド版 (`/plugin marketplace add ...` / `/plugin install ...`)
> は README_ja.md に記載されているが、この spike では OS シェルの
> `claude plugin ...` 経由のみ検証済み。スラッシュコマンド版の挙動は未検証。

### ⚠️ セッション途中でインストールした場合の注意

`claude plugin install` でインストールしても、**すでに起動している Claude Code セッションには
`/uxaudit:uxaudit` スラッシュコマンドとサブエージェント (`uxaudit-scout` など) は load されない**。
Claude Code は plugin のスキル / エージェントをセッション開始時にだけ読み込むため、以下のいずれかが必要:

1. **Claude Code を再起動** してから `/uxaudit:uxaudit` を叩く (推奨)
2. 代替として `.claude/rules/ux-review.md` の AI レビュー fallback に切り替える

Issue #18 の spike では 2 の fallback を採用して iteration-1 ベースラインを確保した。
**新しく Claude Code を起動し直してから 1 を走らせる方が、自動化された完全なベースラインが得られる**。

## 実行 (slash command)

Claude Code を再起動後、対象 SPA を `npm run preview` (vite preview デフォルト 4173) で
起動した状態で:

```text
/uxaudit:uxaudit tacticsboard --lang ja
```

必要に応じてフラグを追加:

- `--url http://localhost:4173` — auto-detect が外れるときに明示
- `--viewport desktop` — 既定は Scout 推定 / `desktop`
- `--yes` — 無人モード (dev-server disambiguation の確認プロンプトを自動解決)
- `--scenario-mode locked` — 2 回目以降、同じジャーニー契約で回帰比較したいとき

uxaudit 本家の生出力は **plugin 既定の workspace (`./.agents/uxaudit/<target>/iteration-N/`
など、plugin が SKILL.md の playbook で決める場所)** に書き出される。
`benchmark.json` / `dashboard.html` / `evidence/` / `steps.json` などの raw artifact は
そこに残す (必要に応じて `.gitignore` で除外)。

その上で **人間が読む要約だけを `docs/uxaudit/iteration-<N>/summary.md` に
抽出して git 管理する**。これにより "plugin 自動出力" と "人間キュレーション後の要約"
の境界が明確になる。

## iteration 命名規約 (本プロジェクト)

- **人間向け要約と spike 成果物は `docs/uxaudit/iteration-<N>/` に保存する**
  (git 管理。`.tmp/` ではない理由: `.tmp/` は gitignore で履歴が残らないため)
- **uxaudit 本家の raw artifact は plugin 既定 workspace** (`./.agents/uxaudit/...` など)
  に置いたまま git 管理しない。summary.md から相対パスで参照する
- 最初のイテレーションは `iteration-1`。Phase 5 完了時点のスナップショット
- 各 iteration 配下のファイル構成:
  - **spike iteration (プラグインが動かず fallback を使った回)**
    - `summary.md` (必須) — 人間が読む要約 + 4 失敗パターン判定
    - `install-log.md` (任意) — spike 手順を再現するための生ログ
    - _`manual-ai.md` は Gemini/Codex 並列レビューを実行した場合のみ_
  - **正式 iteration (uxaudit 本家が走った回)**
    - `summary.md` (必須) — 人間向け最終要約
    - `manual-ai.md` (必須) — 3 者並列レビューの生統合ログ (`.claude/rules/ux-review.md` 参照)
    - (オプション) `evidence/` — uxaudit の生スクショをここにシンボリックリンク or コピーしたい場合
- `evidence/` をコミットする場合は **5 MB/iteration** を超えたら `.gitignore` で
  除外し、`summary.md` 冒頭に「原本はローカル `evidence/` にある」と注記する

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
