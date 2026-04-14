# Git ワークフロー

ブランチ・PR・コミット・大きめ実装の事前計画フローをまとめる。

## ブランチ構成 (dev / main 2 本運用)

Issue #79 以降、**dev = 統合ブランチ / main = 本番** の 2 本運用。Vercel が両方の
ブランチを自動デプロイしており、main は公開 URL (`starward-tactics.vercel.app`)、
dev は Vercel が生成する preview URL に対応する。

| ブランチ | 役割 | 直 push |
|---|---|---|
| `main` | 本番。公開 URL | **禁止** (release PR のみ) |
| `dev` | 統合。feature マージ先 | **禁止** (feature PR のみ) |
| `feat/<N>-<slug>` | 作業ブランチ | ここだけ push OK |

main / dev 両方への直 push は `guard-git.sh` で物理的にブロックされている
(issue #79)。`--no-verify` や amend でも迂回できないのでそのつもりで動く。

## ブランチ命名

`feat/<issue番号>-<kebab名>`

実例 (Phase 5 の URL 共有 + ツールバー実装): `feat/6-url-share-toolbar`

**dev からブランチを切って作業し、PR 経由で dev にマージする**。main への PR は
後述の「Release PR」と「Hotfix PR」だけが例外。

## Release PR (dev → main)

dev に溜まった feature 群を本番に昇格させる PR。

- タイミング: 機能群単位 or 週次で作成 (厳密な周期は定めない)
- base: `main`, head: `dev`
- 本文に **release note** (含まれる feature PR 番号の列挙) を書く
- マージ方式は通常の feature PR と同じ merge commit (squash ではない)

## Hotfix PR (feature → main 直行、例外)

本番障害を即時に直すときだけ、feature → main の直行 PR を許容する。

- タイミング: **本番障害の即時修正が必要な場合のみ**
- base: `main`, head: `fix/<issue番号>-<slug>` (hotfix は `fix/` prefix を推奨)
- merge 後 **24 時間以内** に `gh pr create --base dev --head main` で sync PR を作り、
  main を dev にも取り込む (忘れると dev の feature が次の release PR で main に戻す時に
  hotfix を巻き戻す事故が起きる)

sync PR を忘れないために: hotfix 直後、GitHub の PR template などに頼らず、
手で sync PR を立てることを前提にする。CI で強制するのは将来 Issue。

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
- 末尾に `Co-Authored-By: Claude <noreply@anthropic.com>` を付与 (具体的なモデル名は固定しない。モデル更新時の陳腐化を避けるため)

### amend ではなく新コミットを積む

レビュー指摘を反映するときは **既存コミットへの amend ではなく新しいコミット** を積む。

理由: amend するとレビュアー視点で「何が修正されたか」が消える。Phase 1〜5 では「レビュー指摘を反映: ...」というプレフィックスで新コミットを積む運用が定着している。

## 大きめ実装の事前計画フロー

新 hook / 新 reducer / 新ファイル群のような大きめの実装に着手する前は:

1. **`drafts/<phaseN>-plan.md` (または `drafts/<issue番号>-<topic>-plan.md`) に計画書を書く**
   - ひな形はローカルの **`drafts/_plan-template.md`** をコピーして埋める。`drafts/` は `.gitkeep` のみ追跡しており、計画書ファイル自体はコミットしない (issue 完了後に削除する)。clone 直後 / 別 worktree でテンプレが存在しない場合は**このファイル末尾の「計画書スケルトン」節をコピーして起点にする** (本ルールが self-contained になるように最小構成を埋め込んである)
   - **なぜ `.tmp/` ではなく `drafts/` か**: Gemini CLI 等の AI ツールは `.gitignore` を ignore source として尊重するため、`.tmp/` (gitignore 対象) に置いたファイルを `read_file` で読めない。`drafts/` は gitignore 対象外なので AI ツールから参照可能
   - ⚠️ `drafts/` は gitignore 対象外のため、計画書が `git add .` で誤コミットされうる。コミット時はファイル名を個別指定すること。issue 完了後は計画書を削除する
   - **「検証シナリオ」セクションは必須**。`正常系 1 / 異常系 1 / エッジ 1` の最小構成から書き始め、必要に応じて足す (儀式化を避けるため最初から網羅を狙わない)
   - シナリオは **ゴール形式 (手順ではなく目的)** で書く。「どのボタンをクリックするか」ではなく「ユーザーが何を達成できる状態か」を記述する
2. **`/ask-others` でセカンドオピニオン** (Gemini CLI + Codex CLI 並列) を取る
3. 両者推奨の改善は計画書に反映してから実装に入る

計画書の改訂履歴は残さなくて良い (採用結果が計画書、議論ログは PR 本文に書く)。

⚠️ `/ask-others` は Gemini CLI と Codex CLI の両方が認証済みでインストールされている **ローカル開発環境専用** のフロー。Claude Code GitHub 連携 (スマホアプリ経由のリモート起動など) では CLI が利用できないため、このスキルは動かない。リモート環境ではセカンドオピニオンを省略するか、PR コメント経由で追加レビューを依頼するなどの代替策に切り替える。

### 検証シナリオをゴール形式で書く理由

Builder (実装する Claude) ・ Reviewer (`/review` の 3 者) ・ 将来の uxaudit / 手動検証が、**同じシナリオを独立再生**できるようにするため。手順形式 (「①X をクリック ②Y を確認」) だと UI が変わるたびにシナリオが壊れ、再利用できない。目的形式 (「ユーザーが盤面を共有して別タブで再現できる」) なら、UI が変わっても「再現できたか」だけで判定できる。

ゴール形式の例:

```markdown
## 検証シナリオ

### 正常系
- ユーザーが盤面に駒を置き、Inspector で属性を変更し、URL を共有して
  別タブで開いたとき、同じ盤面が再現できる

### 異常系
- 不正な `?b=` クエリが渡されたとき、デフォルト盤面で起動し、エラーを
  ユーザーに見せない

### エッジケース
- 駒数 0 の状態で URL 共有 → 復元したとき空盤面になる
```

## レビューサイクル

feature 実装後の PR は **`/review` (Claude サブエージェント / Gemini CLI / Codex CLI 3 者並列)** でレビューする。

- 重要度「高」と [共通] の高は **原則修正必須**。ゼロになるまで修正サイクルを回す
- 却下してよいのは **中・低まで**。高を例外的に却下する場合は根拠を特に強く書き、根拠が弱いと感じたら却下せず修正に戻す (「高ゼロ」判定を却下理由の強度でごまかさない)
- **AI (Claude / Gemini / Codex) の指摘を意図的に見送る場合は重要度を問わず、却下理由を PR コメントに残す** (旧ルールの「中・低のみ記録」を拡張。高の例外却下も同じコメントにまとめて書く)
- レビュー結果のサマリは PR コメントに投稿してから merge する

AI 指摘の却下理由を残す目的: 次回レビューで Reviewer が「前回の指摘は無視されたのか採用されたのか」を判断できるようにし、評価軸をぶらさないため。口頭で「今回は意図的にスルーした」と言っても次セッションの Reviewer には伝わらない。

## UX ベースライン更新

UI を変える PR は merge 前に **iteration を 1 つ進める**。進めない場合はその理由を PR コメントに残す。

iteration を進める方法は 2 つ:

1. **uxaudit 本家** (`/uxaudit:uxaudit`) — plugin がインストール済みなら自動で L1〜L4 検証を走らせる。詳細は `.claude/rules/uxaudit.md` を参照
2. **AI レビュー fallback** (`.claude/rules/ux-review.md`) — plugin が動かない / 軽量チェックだけ欲しい場合。Claude + Gemini + Codex の 3 者でスクショベースの UX レビューを行う

いずれの場合も結果を `docs/uxaudit/iteration-<N>/summary.md` に記録する。判定軸は「4 失敗パターン (伝わらない / ぼやける / 見つからない / 始まらない)」と「Credo 4 原則」の 2 階層 (`.claude/rules/uxaudit.md` / `.claude/rules/credo.md` 参照)。

「UI を変える」の判断基準: 画面表示・導線・スタイルに影響する変更を含む PR は対象。典型例は `src/components/` 配下だが、`src/App.tsx` / `src/index.css` / `public/` 内の静的アセットなども該当する。純粋なロジック変更 (reducer / codec / hook のみ) で画面描画に影響しない場合は対象外。迷ったら進めておく方が安全。

## 品質ゲート (push 前に必ず通す)

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

1 つでも fail したら **根本原因を直してから** push する。`--no-verify` で hook をスキップしない。

## 計画書スケルトン (ローカルテンプレ復元用)

ローカルに `drafts/_plan-template.md` が無い環境 (clone 直後 / 別 worktree / CI など) では、以下をコピーして新しい計画書の起点にする。より詳しい注記付きテンプレは `drafts/_plan-template.md` 側を参照 (存在すれば)。

```markdown
# {Issue 番号 / Phase 番号}: {タイトル}

Issue: naruwata770-lang/tacticsboard#{N}
Branch: `feat/{N}-{topic}`

## ゴール

<!-- 1-3 行。ユーザー / 開発者が得る状態を書く (実装手順ではない)。 -->

## 背景 / なぜやるか

## 設計方針

## スコープ / スコープ外

## 検証シナリオ (必須・ゴール形式)

<!--
  正常系 1 / 異常系 1 / エッジ 1 の最小構成から始める。
  必要に応じて足す (儀式化を避けるため最初から網羅を狙わない)。
  書き方はゴール形式 (手順ではなく目的): 「X をクリック」ではなく「ユーザーが何を達成できる状態か」。
-->

### 正常系
-

### 異常系
-

### エッジケース
-

## 実装ステップ

## リスク

## セカンドオピニオン (`/ask-others`) 反映

## 完了条件

- [ ] 検証シナリオ (正常系 / 異常系 / エッジ) がすべて再現できる
- [ ] `npm run lint && npm run typecheck && npm run test && npm run build` 全通過
- [ ] `/review` で重要度「高」と [共通] の高がゼロ (却下した指摘は理由付きで PR コメントに記録)
- [ ] PR 本文に `Closes #{N}` を記載
```
