# Git ワークフロー

ブランチ・PR・コミット・大きめ実装の事前計画フローをまとめる。

## ブランチ命名

`feat/<issue番号>-<kebab名>`

例: `feat/6-url-share-toolbar`, `feat/16-claude-md`

main からブランチを切って作業し、PR 経由でマージする。**main への直 push は禁止** (文書修正でも PR 経由)。

## マージ方式

**merge commit を使う** (squash でも rebase でもない)。

```bash
gh pr merge <PR番号> --merge --delete-branch
```

理由: Phase 1〜5 を通じて merge commit で運用しており、履歴上で「どの PR でどのコミット群が入ったか」を追えるようにしている。

## PR の作り方

- タイトルは短く (70 字以内)、本文に詳細を書く
- 本文に **`Closes #<issue番号>`** を含めて Issue を自動 close
- PR 本文の構成: `## Summary` (1-3 行) + `## Test plan` (チェックリスト)

```bash
gh pr create --title "..." --body "$(cat <<'EOF'
## Summary
- ...

## Test plan
- [ ] ...

Closes #N
EOF
)"
```

## コミットメッセージ規約

- **日本語で書く**
- 1 行目はアクション + 対象
  - 例: `Phase 5: URL 共有 + 最小ツールバー (Undo/Redo/Reset) を実装`
  - 例: `レビュー指摘を反映: race condition / encode 防御 / popstate / モック汚染`
- 本文に「**なぜ**」を残す (「何を」は diff で分かる)
- 末尾に `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>` を付与

### amend ではなく新コミットを積む

レビュー指摘を反映するときは **既存コミットへの amend ではなく新しいコミット** を積む。

理由: amend するとレビュアー視点で「何が修正されたか」が消える。Phase 1〜5 では「レビュー指摘を反映: ...」というプレフィックスで新コミットを積む運用が定着している。

## 大きめ実装の事前計画フロー

新 hook / 新 reducer / 新ファイル群のような大きめの実装に着手する前は:

1. **`.tmp/<phaseN>-plan.md` (または `.tmp/<issue番号>-<topic>-plan.md`) に計画書を書く**
2. **`/ask-others` でセカンドオピニオン** (Gemini CLI + Codex CLI 並列) を取る
3. 両者推奨の改善は計画書に反映してから実装に入る

計画書の改訂履歴は残さなくて良い (採用結果が計画書、議論ログは PR 本文に書く)。

## レビューサイクル

feature 実装後の PR は **`/review` (Claude サブエージェント / Gemini CLI / Codex CLI 3 者並列)** でレビューする。

- 重要度「高」と [共通] の高がゼロになるまで修正サイクルを回す
- 中・低の指摘を意図的に見送る場合は **理由付きで PR コメントに残す**
- レビュー結果のサマリは PR コメントに投稿してから merge する

## 品質ゲート (push 前に必ず通す)

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

1 つでも fail したら **根本原因を直してから** push する。`--no-verify` で hook をスキップしない。
