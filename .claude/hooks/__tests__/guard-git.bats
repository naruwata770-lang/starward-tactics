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

# guard が deny を返したか判定するヘルパー (Hook プロトコル契約)。
# 契約: deny ケースでも guard-git.sh は exit 0 + deny JSON を stdout に書く。
assert_denied() {
  [[ "$status" -eq 0 ]] || { echo "expected exit 0, got $status"; return 1; }
  [[ "$output" == *'"permissionDecision":"deny"'* ]] \
    || { echo "expected deny JSON, got: $output"; return 1; }
}

# guard が pass (allow) を返したか判定するヘルパー (Hook プロトコル契約)。
# 契約: allow ケースでは exit 0 + stdout 空。
# レビュー指摘 (Codex): 「deny がない」だけでは脆い。allow=空文字も同時に固定する。
assert_passed() {
  [[ "$status" -eq 0 ]] || { echo "expected exit 0, got $status"; return 1; }
  [[ -z "$output" ]] || { echo "expected empty stdout, got: $output"; return 1; }
}

# ------------------------------------------------------------
# 1. 仕様テスト (spec)
# ------------------------------------------------------------

# --- 1a. refspec 明示 main 検知 ---

@test "T1 spec: git push origin main → deny (1a)" {
  invoke 'git push origin main'
  assert_denied
}

@test "T2 spec: git push origin HEAD:main → deny (1a)" {
  invoke 'git push origin HEAD:main'
  assert_denied
}

@test "T3 spec: git push origin refs/heads/main → deny (1a)" {
  invoke 'git push origin refs/heads/main'
  assert_denied
}

@test "T4 spec: git push origin :main (delete) → deny (1a)" {
  invoke 'git push origin :main'
  assert_denied
}

@test "T5 spec: git push -u upstream main → deny (1a)" {
  invoke 'git push -u upstream main'
  assert_denied
}

@test "T6 spec: git push origin HEAD:refs/heads/main → deny (1a)" {
  invoke 'git push origin HEAD:refs/heads/main'
  assert_denied
}

# --- 1b. 現在ブランチ main 検知 ---
# fake repo を作って CLAUDE_PROJECT_DIR で参照させる。

@test "T7 spec: 現在ブランチ main + push origin feature-x → deny (1b)" {
  make_repo "$BATS_TEST_TMPDIR/main-repo" main
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/main-repo" invoke 'git push origin feature-x'
  assert_denied
}

@test "T8 spec: 現在ブランチ feature + push origin feature-x → pass" {
  make_repo "$BATS_TEST_TMPDIR/feature-repo" feature-x
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/feature-repo" invoke 'git push origin feature-x'
  assert_passed
}

@test "T9 spec: 現在ブランチ feature + push (refspec なし) → pass" {
  make_repo "$BATS_TEST_TMPDIR/feature-repo" feature-x
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/feature-repo" invoke 'git push'
  assert_passed
}

@test "T10 spec: 現在ブランチ main + push (refspec なし) → deny (1b 本丸)" {
  make_repo "$BATS_TEST_TMPDIR/main-repo" main
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/main-repo" invoke 'git push'
  assert_denied
}

@test "T11 spec: 現在ブランチ main + push origin HEAD → deny (1b)" {
  make_repo "$BATS_TEST_TMPDIR/main-repo" main
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/main-repo" invoke 'git push origin HEAD'
  assert_denied
}

@test "T12 spec: 現在ブランチ main + push -u origin HEAD → deny (1b)" {
  make_repo "$BATS_TEST_TMPDIR/main-repo" main
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/main-repo" invoke 'git push -u origin HEAD'
  assert_denied
}

# --- 1a. refspec 明示 dev 検知 (issue #79 で追加) ---

@test "T20 spec: git push origin dev → deny (1a dev)" {
  invoke 'git push origin dev'
  assert_denied
}

@test "T21 spec: git push origin HEAD:dev → deny (1a dev)" {
  invoke 'git push origin HEAD:dev'
  assert_denied
}

@test "T22 spec: git push origin refs/heads/dev → deny (1a dev)" {
  invoke 'git push origin refs/heads/dev'
  assert_denied
}

@test "T23 spec: git push origin :dev (delete) → deny (1a dev)" {
  invoke 'git push origin :dev'
  assert_denied
}

@test "T24 spec: git push -u upstream dev → deny (1a dev)" {
  invoke 'git push -u upstream dev'
  assert_denied
}

@test "T25 spec: git push origin HEAD:refs/heads/dev → deny (1a dev)" {
  invoke 'git push origin HEAD:refs/heads/dev'
  assert_denied
}

# --- 1b. 現在ブランチ dev 検知 (issue #79 で追加) ---

@test "T26 spec: 現在ブランチ dev + push origin feature-x → deny (1b dev)" {
  make_repo "$BATS_TEST_TMPDIR/dev-repo" dev
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/dev-repo" invoke 'git push origin feature-x'
  assert_denied
}

@test "T27 spec: 現在ブランチ dev + push (refspec なし) → deny (1b dev 本丸)" {
  make_repo "$BATS_TEST_TMPDIR/dev-repo" dev
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/dev-repo" invoke 'git push'
  assert_denied
}

@test "T28 spec: 現在ブランチ dev + push -u origin HEAD → deny (1b dev)" {
  make_repo "$BATS_TEST_TMPDIR/dev-repo" dev
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/dev-repo" invoke 'git push -u origin HEAD'
  assert_denied
}

# --- 偽陽性防止: dev / main を含む feature ブランチ名は誤 block しない ---

@test "T29 spec: 現在ブランチ feat/dev-tools + push → pass (dev prefix は単語境界外)" {
  make_repo "$BATS_TEST_TMPDIR/dev-prefix-repo" feat/dev-tools
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/dev-prefix-repo" invoke 'git push -u origin HEAD'
  assert_passed
}

@test "T30 spec: git push origin feat/dev-tools → pass (refspec 境界検知)" {
  make_repo "$BATS_TEST_TMPDIR/feat-repo" feat/dev-tools
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/feat-repo" invoke 'git push origin feat/dev-tools'
  assert_passed
}

# --- 2. amend 検知 ---

@test "T13 spec: git commit --amend → deny (2)" {
  invoke 'git commit --amend'
  assert_denied
}

@test "T14 spec: git commit -m \"fix --amend bug\" (引用符内 --amend) → pass (クォート除去)" {
  invoke 'git commit -m "fix --amend bug"'
  assert_passed
}

# --- 3. --no-verify 検知 ---

@test "T15 spec: git commit --no-verify → deny (3)" {
  invoke 'git commit --no-verify -m "msg"'
  assert_denied
}

@test "T16 spec: git commit -n (短縮形) → deny (3)" {
  invoke 'git commit -n -m "msg"'
  assert_denied
}

@test "T17 spec: git push --no-verify (feature ブランチ) → deny (3)" {
  make_repo "$BATS_TEST_TMPDIR/feature-repo" feature-x
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/feature-repo" invoke 'git push --no-verify origin feature-x'
  assert_denied
}

# --- 早期 exit / 対象外 ---

@test "T18 spec: git status → pass (git だが対象外)" {
  invoke 'git status'
  assert_passed
}

@test "T19 spec: npm run test → pass (git キーワードを含まない、早期 exit)" {
  invoke 'npm run test'
  assert_passed
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
  assert_passed
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
  assert_passed
}

@test "[KNOWN-LIMIT] K3: detached HEAD で push (refspec 非 main) → pass" {
  # CURRENT_BRANCH が空文字になり 1b 不発火。1a も refspec 非 main なので pass。
  # detached HEAD で意図せず作業した時に検知できないが、現状の制約。
  make_repo "$BATS_TEST_TMPDIR/detached-repo" main
  (cd "$BATS_TEST_TMPDIR/detached-repo" && git checkout -q --detach)
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/detached-repo" invoke 'git push origin feature-x'
  assert_passed
}

@test "[KNOWN-LIMIT] K4: git commit -nm \"msg\" (combined short flag) → pass" {
  # 現実装の (^|\s)-n(\s|$) regex は -nm を -n と認識しない (後続が空白でも EOL でもなく m)。
  # combined short flag (-n + -m を 1 トークンにまとめる) は git commit のサポート機能。
  # 禁止したいなら regex を直す必要がある。現状は許容している。
  invoke 'git commit -nm "msg"'
  assert_passed
}

@test "[KNOWN-LIMIT] K5a: 不正な JSON 入力 (parse fail) → no-crash / pass" {
  # node -e の try/catch でフォールバックし COMMAND が空文字になるため早期 exit。
  # ただし stdin に 'git' を含まない素のテキストは grep -q 'git' で先に弾かれる。
  run bash "$GUARD_SH" <<< 'this is not json'
  assert_passed
}

@test "[KNOWN-LIMIT] K5b: 'git' を含む不正 JSON → no-crash / pass" {
  # 'git' を含むので grep -q 'git' は通過する。node の JSON.parse が throw → catch で空文字出力 → COMMAND 空 → 早期 exit。
  # K5a と分けることで「parse fail 経路」を本当に踏むことを保証する (Codex / Claude sub-agent レビュー指摘)。
  run bash "$GUARD_SH" <<< 'git push origin main (this is not json)'
  assert_passed
}

@test "[KNOWN-LIMIT] K5c: tool_input.command が空文字 (valid JSON) → no-crash / pass" {
  # 構造的に valid な JSON だが COMMAND が空文字 → 早期 exit (空コマンドは何もしない)。
  run bash "$GUARD_SH" <<< '{"tool_input":{"command":""}}'
  assert_passed
}

@test "[KNOWN-LIMIT] K6: CLAUDE_PROJECT_DIR 空文字 + カレント非 repo + push (1a 非該当) → pass" {
  # ${CLAUDE_PROJECT_DIR:-.} で . に落ち、git symbolic-ref が non-zero → CURRENT_BRANCH 空文字 → 1b 不発火。
  # 1a も refspec 非 main なので pass。クラッシュしないことが本質。
  cd "$BATS_TEST_TMPDIR"
  CLAUDE_PROJECT_DIR="" invoke 'git push origin feature-x'
  assert_passed
}

@test "[KNOWN-LIMIT] K7: 引用符付き refspec git push origin \"main\" → pass (sed クォート除去で 1a 不発火)" {
  # guard-git.sh は STRIPPED で sed 's/"[^"]*"//g' を先にかけるため、
  # `git push origin "main"` は `git push origin ` になり 1a regex に main が出ない。
  # = quoted refspec で main 直 push が可能 = 既知の限界。
  # Claude Code の生成コマンドは通常クォートしないため実害は限定的だが、明示的に fixate しておく。
  # (ask-others Gemini T19 / Codex review #2 指摘)
  #
  # Issue #79 で発見: CLAUDE_PROJECT_DIR を明示しないと `.` (CI workspace) に fallback し、
  # CI が main/dev を checkout した状態で走るときに 1b が発火して false-fail する。
  # このテストは 1a の quote-strip 挙動を fixate するのが目的なので、1b が発火しない
  # feature ブランチの fake repo を CLAUDE_PROJECT_DIR に与える。
  make_repo "$BATS_TEST_TMPDIR/feature-repo" feature-x
  CLAUDE_PROJECT_DIR="$BATS_TEST_TMPDIR/feature-repo" invoke 'git push origin "main"'
  assert_passed
}
