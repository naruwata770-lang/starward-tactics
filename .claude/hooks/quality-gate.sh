#!/usr/bin/env bash
# quality-gate.sh — Stop Hook
# Claude がタスク完了で停止する前に品質ゲート (lint/typecheck/test/build) を実行する。
#
# なぜ変更検知を行うか:
#   CLAUDE.md のルールは「push 前に全通過」であり「停止前」ではない。
#   コード未変更の調査セッションや、変更を伴わない作業では品質ゲートをスキップし、
#   停止不能になることを防ぐ。(Codex レビュー指摘 #2 を反映)

set -euo pipefail

# --- 変更検知 ---
# working tree と index の両方をチェック。変更なしなら品質ゲートをスキップ。
# untracked files (src/ 配下の新規ファイル) も検知対象にする。
HAS_CHANGES=false

if ! git diff --quiet 2>/dev/null; then
  HAS_CHANGES=true
elif ! git diff --cached --quiet 2>/dev/null; then
  HAS_CHANGES=true
elif [[ -n "$(git ls-files --others --exclude-standard -- 'src/' '*.ts' '*.tsx' 2>/dev/null)" ]]; then
  HAS_CHANGES=true
fi

if [[ "$HAS_CHANGES" == "false" ]]; then
  # 変更なし — 品質ゲートスキップ
  exit 0
fi

# --- 品質ゲート実行 ---
FAILED=""

run_check() {
  local name="$1"
  shift
  if ! "$@" > /dev/null 2>&1; then
    FAILED="${FAILED}${FAILED:+, }${name}"
  fi
}

run_check "lint"      npm run lint
run_check "typecheck" npm run typecheck
run_check "test"      npm run test
run_check "build"     npm run build

if [[ -n "$FAILED" ]]; then
  echo "[Hook] 品質ゲート失敗: ${FAILED}" >&2
  echo "停止前に上記を修正してください。修正が困難な場合はユーザーに相談してください。" >&2
  exit 2
fi

# 全通過 — 停止許可
exit 0
