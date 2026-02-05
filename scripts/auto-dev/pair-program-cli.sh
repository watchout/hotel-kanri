#!/bin/bash
#
# Claude Code + Codex ペアプログラミングスクリプト（CLI版）
#
# 2つのAI（Claude Code + Codex）を交互に使い、
# より高品質なコードを生成するワークフロー
#
# Usage:
#   ./pair-program-cli.sh implement <ssot-path> [output-dir]
#   ./pair-program-cli.sh review <code-file> [ssot-path]
#   ./pair-program-cli.sh iterate <code-file> <rounds>
#
# Prerequisites:
#   - claude CLI (Claude Code)
#   - codex CLI (OpenAI Codex) または openai CLI
#
# @version 1.0.0

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORK_DIR="${SCRIPT_DIR}/../../.pair-program-work"
LOG_FILE="${WORK_DIR}/session.log"

# 色付きログ
log_info() { echo -e "\033[0;34mℹ️  $1\033[0m"; }
log_success() { echo -e "\033[0;32m✅ $1\033[0m"; }
log_warning() { echo -e "\033[0;33m⚠️  $1\033[0m"; }
log_error() { echo -e "\033[0;31m❌ $1\033[0m"; }
log_step() { echo -e "\033[0;36m🔄 $1\033[0m"; }

# 作業ディレクトリ初期化
init_workspace() {
  mkdir -p "${WORK_DIR}"
  echo "=== Pair Programming Session: $(date) ===" >> "${LOG_FILE}"
}

# CLIツールの存在確認
check_tools() {
  local has_claude=false
  local has_codex=false
  
  if command -v claude &> /dev/null; then
    has_claude=true
    log_success "Claude Code CLI: 利用可能"
  else
    log_warning "Claude Code CLI: 見つかりません"
  fi
  
  if command -v codex &> /dev/null; then
    has_codex=true
    log_success "Codex CLI: 利用可能"
  elif command -v openai &> /dev/null; then
    has_codex=true
    log_success "OpenAI CLI: 利用可能（Codexの代替）"
  else
    log_warning "Codex/OpenAI CLI: 見つかりません"
  fi
  
  if [ "$has_claude" = false ] && [ "$has_codex" = false ]; then
    log_error "少なくとも1つのCLIツールが必要です"
    exit 1
  fi
}

# SSOTからコード生成（Claude Code）
implement_from_ssot() {
  local ssot_path="$1"
  local output_dir="${2:-${WORK_DIR}}"
  
  if [ ! -f "$ssot_path" ]; then
    log_error "SSOTファイルが見つかりません: $ssot_path"
    exit 1
  fi
  
  log_step "Phase 1: Claude Code（Driver）が実装開始..."
  
  local ssot_content
  ssot_content=$(cat "$ssot_path")
  
  local prompt="以下のSSOT（仕様書）に基づいてTypeScriptコードを実装してください。

## SSOT
${ssot_content}

## 指示
1. 要件IDを全て確認し、コメントで記載
2. Accept条件を満たす実装
3. エラーハンドリングを含める
4. 型定義を明確に

コードのみを出力してください。"

  # Claude Code で実装
  local output_file="${output_dir}/implementation-v1.ts"
  
  if command -v claude &> /dev/null; then
    echo "$prompt" | claude --print > "$output_file" 2>> "${LOG_FILE}"
    log_success "初期実装完了: $output_file"
  else
    log_warning "Claude CLIがないため、プロンプトを出力します"
    echo "=== Claude Code への依頼 ===" > "$output_file"
    echo "$prompt" >> "$output_file"
  fi
  
  echo "$output_file"
}

# コードレビュー（Codex/OpenAI）
review_code() {
  local code_file="$1"
  local ssot_path="$2"
  
  if [ ! -f "$code_file" ]; then
    log_error "コードファイルが見つかりません: $code_file"
    exit 1
  fi
  
  log_step "Phase 2: Codex（Navigator）がレビュー..."
  
  local code_content
  code_content=$(cat "$code_file")
  
  local ssot_ref=""
  if [ -n "$ssot_path" ] && [ -f "$ssot_path" ]; then
    ssot_ref="## 参照SSOT
$(head -100 "$ssot_path")
"
  fi
  
  local prompt="あなたは経験豊富なシニアエンジニアです。以下のコードをレビューしてください。

${ssot_ref}

## レビュー対象コード
\`\`\`typescript
${code_content}
\`\`\`

## レビュー観点
1. SSOT準拠: 要件を満たしているか
2. 品質: 可読性、保守性、パフォーマンス
3. セキュリティ: 脆弱性、入力検証
4. ベストプラクティス: 設計パターン、エラーハンドリング

## 出力形式
### 問題点
- [問題1]
- [問題2]

### 改善提案
- [提案1]
- [提案2]

### 修正後のコード（重要な部分のみ）
\`\`\`typescript
// 修正が必要な部分
\`\`\`"

  local review_file="${WORK_DIR}/review.md"
  
  if command -v codex &> /dev/null; then
    echo "$prompt" | codex --print > "$review_file" 2>> "${LOG_FILE}"
    log_success "レビュー完了: $review_file"
  elif command -v openai &> /dev/null; then
    echo "$prompt" | openai api chat.completions.create \
      -m gpt-4o \
      -g user "$prompt" > "$review_file" 2>> "${LOG_FILE}"
    log_success "レビュー完了: $review_file"
  else
    log_warning "Codex/OpenAI CLIがないため、プロンプトを出力します"
    echo "=== Codex への依頼 ===" > "$review_file"
    echo "$prompt" >> "$review_file"
  fi
  
  echo "$review_file"
}

# レビューを反映（Claude Code）
apply_review() {
  local code_file="$1"
  local review_file="$2"
  
  if [ ! -f "$code_file" ] || [ ! -f "$review_file" ]; then
    log_error "ファイルが見つかりません"
    exit 1
  fi
  
  log_step "Phase 3: Claude Code（Driver）が修正を反映..."
  
  local code_content
  code_content=$(cat "$code_file")
  
  local review_content
  review_content=$(cat "$review_file")
  
  local prompt="以下のレビューフィードバックを元のコードに反映してください。

## 元のコード
\`\`\`typescript
${code_content}
\`\`\`

## レビューフィードバック
${review_content}

## 指示
1. 全ての問題点を修正
2. 改善提案を反映
3. コメントで修正内容を記載
4. 最終版のコードのみを出力

修正後のコードのみを出力してください。"

  local output_file="${WORK_DIR}/implementation-final.ts"
  
  if command -v claude &> /dev/null; then
    echo "$prompt" | claude --print > "$output_file" 2>> "${LOG_FILE}"
    log_success "最終版生成完了: $output_file"
  else
    log_warning "Claude CLIがないため、プロンプトを出力します"
    echo "=== Claude Code への依頼 ===" > "$output_file"
    echo "$prompt" >> "$output_file"
  fi
  
  echo "$output_file"
}

# 反復改善（複数ラウンド）
iterate_improvement() {
  local code_file="$1"
  local rounds="${2:-3}"
  local ssot_path="$3"
  
  log_info "反復改善開始: ${rounds}ラウンド"
  
  local current_file="$code_file"
  
  for i in $(seq 1 "$rounds"); do
    echo ""
    log_step "=== ラウンド $i/$rounds ==="
    
    # レビュー
    local review_file
    review_file=$(review_code "$current_file" "$ssot_path")
    
    # 修正
    local improved_file="${WORK_DIR}/implementation-v$((i+1)).ts"
    
    local code_content
    code_content=$(cat "$current_file")
    
    local review_content
    review_content=$(cat "$review_file")
    
    if command -v claude &> /dev/null; then
      echo "以下のレビューを反映してコードを改善してください。

## 現在のコード
\`\`\`typescript
${code_content}
\`\`\`

## レビュー
${review_content}

修正後のコードのみを出力してください。" | claude --print > "$improved_file" 2>> "${LOG_FILE}"
      
      log_success "ラウンド $i 完了: $improved_file"
      current_file="$improved_file"
    else
      log_warning "Claude CLIがないため、スキップ"
      break
    fi
  done
  
  log_success "反復改善完了: $current_file"
  echo "$current_file"
}

# フル ペアプログラミング フロー
full_pair_programming() {
  local ssot_path="$1"
  local output_dir="${2:-${WORK_DIR}}"
  
  log_info "=== ペアプログラミング開始 ==="
  echo ""
  
  # Phase 1: 実装
  local impl_file
  impl_file=$(implement_from_ssot "$ssot_path" "$output_dir")
  
  echo ""
  
  # Phase 2: レビュー
  local review_file
  review_file=$(review_code "$impl_file" "$ssot_path")
  
  echo ""
  
  # Phase 3: 修正
  local final_file
  final_file=$(apply_review "$impl_file" "$review_file")
  
  echo ""
  log_success "=== ペアプログラミング完了 ==="
  echo ""
  echo "📁 生成ファイル:"
  echo "   初期実装:   $impl_file"
  echo "   レビュー:   $review_file"
  echo "   最終版:     $final_file"
  echo ""
  echo "📋 ログ: ${LOG_FILE}"
}

# ヘルプ
show_help() {
  cat << 'EOF'

Claude Code + Codex ペアプログラミングスクリプト

Usage:
  ./pair-program-cli.sh <command> [options]

Commands:
  implement <ssot-path> [output-dir]
      SSOTからClaude Codeでコード生成
  
  review <code-file> [ssot-path]
      Codexでコードレビュー
  
  apply <code-file> <review-file>
      レビューをClaude Codeで反映
  
  iterate <code-file> <rounds> [ssot-path]
      反復改善（複数ラウンド）
  
  full <ssot-path> [output-dir]
      フル ペアプログラミング フロー
      （実装 → レビュー → 修正）
  
  check
      CLIツールの存在確認
  
  help
      ヘルプを表示

Examples:
  # SSOTから実装（フルフロー）
  ./pair-program-cli.sh full docs/03_ssot/01_admin_features/SSOT_XXX.md
  
  # 既存コードをレビュー
  ./pair-program-cli.sh review src/routes/xxx.ts docs/03_ssot/.../SSOT_XXX.md
  
  # 3ラウンド反復改善
  ./pair-program-cli.sh iterate src/routes/xxx.ts 3

ペアプログラミング構成:
  Driver (実装):     Claude Code
  Navigator (レビュー): Codex / OpenAI GPT-4o

Prerequisites:
  - claude CLI (Claude Code)
  - codex CLI または openai CLI

EOF
}

# メイン
main() {
  init_workspace
  
  case "$1" in
    implement)
      check_tools
      implement_from_ssot "$2" "$3"
      ;;
    review)
      check_tools
      review_code "$2" "$3"
      ;;
    apply)
      check_tools
      apply_review "$2" "$3"
      ;;
    iterate)
      check_tools
      iterate_improvement "$2" "$3" "$4"
      ;;
    full)
      check_tools
      full_pair_programming "$2" "$3"
      ;;
    check)
      check_tools
      ;;
    help|--help|-h|"")
      show_help
      ;;
    *)
      log_error "不明なコマンド: $1"
      show_help
      exit 1
      ;;
  esac
}

main "$@"
