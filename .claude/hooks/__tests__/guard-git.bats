#!/usr/bin/env bats
# guard-git.sh の黒箱ユニットテスト (issue #62)
#
# テスト対象: ../guard-git.sh
# 起動方法: stdin から JSON ({"tool_input":{"command":"..."}}) を流し、
#           stdout に permissionDecision":"deny" が出るかで pass/deny を判定する。
# guard-git.sh は deny ケースでも exit 0 を返す仕様 (Claude Code の Hook プロトコル)。
#
# テストは 2 階層:
#   1. 仕様テスト (T1-T19)         — 「こうあるべき」を assert する回帰検知の本丸
#   2. 既知の限界 (K1-K6)          — 現状挙動を fixate。改善時は期待値を更新する
#
# Git Bash / MSYS2 / WSL / Linux 前提 (Codex のセカンドオピニオン参照)。
# PowerShell ネイティブ環境は対象外。

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

GUARD_SH="${BATS_TEST_DIRNAME}/../guard-git.sh"

# fake repo を BATS 一時ディレクトリ配下に作る。teardown で消す必要はない
# (BATS が _per-test_ TMPDIR を自動片付け。Windows の AV ハンドル残り回避)。
make_repo() {
  local dir="$1"
  local branch="$2"
  mkdir -p "$dir"
  (
    cd "$dir"
    git init -q -b "$branch" 2>/dev/null \
      || { git init -q && git checkout -q -b "$branch"; }
    git config user.email "test@example.com"
    git config user.name "test"
    git commit -q --allow-empty -m "init"
  )
}

# 1 コマンドを guard に流す。$output に stdout、$status に exit code が入る。
invoke() {
  local command="$1"
  local payload
  payload=$(printf '{"tool_input":{"command":%s}}' \
    "$(printf '%s' "$command" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>process.stdout.write(JSON.stringify(d)))')")
  run bash "$GUARD_SH" <<< "$payload"
}

# guard が deny を返したか判定するヘルパー
is_denied() { [[ "$output" == *'"permissionDecision":"deny"'* ]]; }

# ------------------------------------------------------------
# 1. 仕様テスト (spec)
# ------------------------------------------------------------

# --- 1a. refspec 明示 main 検知 ---

@test "T1 spec: git push origin main → deny (1a)" {
  invoke 'git push origin main'
  [[ "$status" -eq 0 ]]
  is_denied
}

@test "T2 spec: git push origin HEAD:main → deny (1a)" {
  invoke 'git push origin HEAD:main'
  is_denied
}

@test "T3 spec: git push origin refs/heads/main → deny (1a)" {
  invoke 'git push origin refs/heads/main'
  is_denied
}

@test "T4 spec: git push origin :main (delete) → deny (1a)" {
  invoke 'git push origin :main'
  is_denied
}

@test "T5 spec: git push -u upstream main → deny (1a)" {
  invoke 'git push -u upstream main'
  is_denied
}

@test "T6 spec: git push origin HEAD:refs/heads/main → deny (1a)" {
  invoke 'git push origin HEAD:refs/heads/main'
  is_denied
}

# --- 1b. 現在ブランチ main 検知 ---
# fake repo を作って CLAUDE_PROJECT_DIR で参照させる。

@test "T7 spec: 現在ブランチ main + push origin feature-x → deny (1b)" {
  make_repo "$BATS_TEST_TMPDIR/main-repo" main
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/main-repo" invoke 'git push origin feature-x'
  is_denied
}

@test "T8 spec: 現在ブランチ feature + push origin feature-x → pass" {
  make_repo "$BATS_TEST_TMPDIR/feature-repo" feature-x
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/feature-repo" invoke 'git push origin feature-x'
  ! is_denied
}

@test "T9 spec: 現在ブランチ feature + push (refspec なし) → pass" {
  make_repo "$BATS_TEST_TMPDIR/feature-repo" feature-x
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/feature-repo" invoke 'git push'
  ! is_denied
}

@test "T10 spec: 現在ブランチ main + push (refspec なし) → deny (1b 本丸)" {
  make_repo "$BATS_TEST_TMPDIR/main-repo" main
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/main-repo" invoke 'git push'
  is_denied
}

@test "T11 spec: 現在ブランチ main + push origin HEAD → deny (1b)" {
  make_repo "$BATS_TEST_TMPDIR/main-repo" main
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/main-repo" invoke 'git push origin HEAD'
  is_denied
}

@test "T12 spec: 現在ブランチ main + push -u origin HEAD → deny (1b)" {
  make_repo "$BATS_TEST_TMPDIR/main-repo" main
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/main-repo" invoke 'git push -u origin HEAD'
  is_denied
}

# --- 2. amend 検知 ---

@test "T13 spec: git commit --amend → deny (2)" {
  invoke 'git commit --amend'
  is_denied
}

@test "T14 spec: git commit -m \"fix --amend bug\" (引用符内 --amend) → pass (クォート除去)" {
  invoke 'git commit -m "fix --amend bug"'
  ! is_denied
}

# --- 3. --no-verify 検知 ---

@test "T15 spec: git commit --no-verify → deny (3)" {
  invoke 'git commit --no-verify -m "msg"'
  is_denied
}

@test "T16 spec: git commit -n (短縮形) → deny (3)" {
  invoke 'git commit -n -m "msg"'
  is_denied
}

@test "T17 spec: git push --no-verify (feature ブランチ) → deny (3)" {
  make_repo "$BATS_TEST_TMPDIR/feature-repo" feature-x
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/feature-repo" invoke 'git push --no-verify origin feature-x'
  is_denied
}

# --- 早期 exit / 対象外 ---

@test "T18 spec: git status → pass (git だが対象外)" {
  invoke 'git status'
  ! is_denied
}

@test "T19 spec: npm run test → pass (git キーワードを含まない、早期 exit)" {
  invoke 'npm run test'
  ! is_denied
}

# ------------------------------------------------------------
# 2. 既知の限界 (characterization)
#
# このセクションのテストは「現状の guard-git.sh の挙動」を assert する。
# これらは仕様ではなく、正規表現を改善した時に「変えたつもりがどの境界も動かなかった」
# が起きないようにするための回帰検知。
# 限界そのものを直したくなった時は、テスト本体の期待値を更新すること。
# ------------------------------------------------------------

@test "[KNOWN-LIMIT] K1: heredoc 内の main は誤マッチしない (現状 pass)" {
  # 現状は git push 句がないので何もマッチせず pass。
  # 正規表現を厳しくして heredoc を解析するようになったら期待値を見直す。
  invoke $'cat <<EOF\nthis text contains main inside heredoc\nEOF'
  ! is_denied
}

@test "[KNOWN-LIMIT] K2: git -C 経由の main 直 push → pass (push 検知をすり抜ける)" {
  # 現状の 1a/1b 検知の入口は `git\s+push(\s|$)` regex で、 `git -C path push ...` だと
  # git の直後が push でないため push ブロック自体に入らない (1a も 1b も走らない)。
  # = git -C 経由は guard をすり抜ける = 本プロジェクトの「既知の限界」。
  # サーバー側 branch protection rule で補完する前提。
  # 改善するなら regex を `git(\s+-C\s+\S+)?\s+push(\s|$)` などに広げる。
  make_repo "$BATS_TEST_TMPDIR/main-repo" main
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/main-repo" \
    invoke 'git -C /other/repo push origin main'
  ! is_denied
}

@test "[KNOWN-LIMIT] K3: detached HEAD で push (refspec 非 main) → pass" {
  # CURRENT_BRANCH が空文字になり 1b 不発火。1a も refspec 非 main なので pass。
  # detached HEAD で意図せず作業した時に検知できないが、現状の制約。
  make_repo "$BATS_TEST_TMPDIR/detached-repo" main
  (cd "$BATS_TEST_TMPDIR/detached-repo" && git checkout -q --detach)
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/detached-repo" invoke 'git push origin feature-x'
  ! is_denied
}

@test "[KNOWN-LIMIT] K4: git commit -nm \"msg\" (combined short flag) → pass" {
  # 現実装の (^|\s)-n(\s|$) regex は -nm を -n と認識しない (後続が空白でも EOL でもなく m)。
  # combined short flag (-n + -m を 1 トークンにまとめる) は git commit のサポート機能。
  # 禁止したいなら regex を直す必要がある。現状は許容している。
  invoke 'git commit -nm "msg"'
  ! is_denied
}

@test "[KNOWN-LIMIT] K5: 不正な JSON 入力 → no-crash / pass" {
  # node -e の try/catch でフォールバックし COMMAND が空文字になるため早期 exit。
  run bash "$GUARD_SH" <<< 'this is not json'
  [[ "$status" -eq 0 ]]
  ! is_denied
}

@test "[KNOWN-LIMIT] K6: CLAUDE_PROJECT_DIR 空文字 + カレント非 repo + push (1a 非該当) → pass" {
  # ${CLAUDE_PROJECT_DIR:-.} で . に落ち、git symbolic-ref が non-zero → CURRENT_BRANCH 空文字 → 1b 不発火。
  # 1a も refspec 非 main なので pass。クラッシュしないことが本質。
  cd "$BATS_TEST_TMPDIR"
  CLAUDE_PROJECT_DIR="" invoke 'git push origin feature-x'
  [[ "$status" -eq 0 ]]
  ! is_denied
}
