#!/bin/bash

##############################################################################
# トレースログ統合スクリプト
#
# 目的: 各システムのトレースログを時系列で統合し、完全なフローを可視化
#
# 使用方法:
#   ./scripts/monitoring/merge-trace-logs.sh <trace_log_directory>
#
# 例:
#   ./scripts/monitoring/merge-trace-logs.sh ./logs/trace/20251002_143000
#
# 作成日: 2025年10月2日
##############################################################################

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 引数チェック
if [ $# -ne 1 ]; then
  echo -e "${RED}エラー: トレースログディレクトリを指定してください${NC}"
  echo "使用方法: $0 <trace_log_directory>"
  exit 1
fi

TRACE_LOG_DIR="$1"

# ディレクトリ存在チェック
if [ ! -d "${TRACE_LOG_DIR}" ]; then
  echo -e "${RED}エラー: ディレクトリが見つかりません: ${TRACE_LOG_DIR}${NC}"
  exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}トレースログ統合開始${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 出力ファイル
MERGED_LOG="${TRACE_LOG_DIR}/merged.log"
ANALYSIS_LOG="${TRACE_LOG_DIR}/analysis.md"

# 一時ファイル
TEMP_LOG="${TRACE_LOG_DIR}/temp_merged.log"

echo -e "${YELLOW}ログファイルを検索中...${NC}"

# 各ログファイルから[TRACE]行を抽出
if [ -f "${TRACE_LOG_DIR}/hotel-common.log" ]; then
  echo -e "${GREEN}✓ hotel-common.log 検出${NC}"
  grep '\[TRACE\]' "${TRACE_LOG_DIR}/hotel-common.log" >> "${TEMP_LOG}" 2>/dev/null || true
fi

if [ -f "${TRACE_LOG_DIR}/hotel-saas.log" ]; then
  echo -e "${GREEN}✓ hotel-saas.log 検出${NC}"
  grep '\[TRACE\]' "${TRACE_LOG_DIR}/hotel-saas.log" >> "${TEMP_LOG}" 2>/dev/null || true
fi

if [ -f "${TRACE_LOG_DIR}/browser.log" ]; then
  echo -e "${GREEN}✓ browser.log 検出${NC}"
  grep '\[TRACE\]' "${TRACE_LOG_DIR}/browser.log" >> "${TEMP_LOG}" 2>/dev/null || true
fi

if [ -f "${TRACE_LOG_DIR}/redis.log" ]; then
  echo -e "${GREEN}✓ redis.log 検出${NC}"
  # Redis MONITORの出力は形式が異なるため、そのまま追加
  echo "" >> "${TEMP_LOG}"
  echo "=== Redis MONITOR ログ ===" >> "${TEMP_LOG}"
  cat "${TRACE_LOG_DIR}/redis.log" >> "${TEMP_LOG}" 2>/dev/null || true
fi

echo ""
echo -e "${YELLOW}ログを時系列で並び替え中...${NC}"

# [T+XXXms]形式のタイムスタンプで並び替え
# sedで[T+XXXms]部分を抽出し、数値でソート
grep '\[T+.*ms\]' "${TEMP_LOG}" | \
  sed 's/.*\[T+\([0-9]*\)ms\].*/\1 &/' | \
  sort -n | \
  sed 's/^[0-9]* //' > "${MERGED_LOG}"

# トレース開始・終了行も追加（これらはタイムスタンプがない）
grep -v '\[T+.*ms\]' "${TEMP_LOG}" | grep '\[TRACE\]' >> "${MERGED_LOG}" || true

# 一時ファイル削除
rm -f "${TEMP_LOG}"

echo -e "${GREEN}✓ 統合ログ作成完了: ${MERGED_LOG}${NC}"
echo ""

# 分析レポート作成
echo -e "${YELLOW}分析レポート作成中...${NC}"

cat > "${ANALYSIS_LOG}" << 'EOF'
# トレースログ分析レポート

## 概要

このレポートは実行トレースログを分析し、処理フローと重要な発見をまとめたものです。

## 処理フロー

以下は時系列で統合されたトレースログから抽出した主要な処理フローです：

### 主要イベント

EOF

# タイムスタンプごとの主要イベントを抽出
grep -E '\[T\+[0-9]+ms\].*└─' "${MERGED_LOG}" | head -50 >> "${ANALYSIS_LOG}" || true

cat >> "${ANALYSIS_LOG}" << 'EOF'

## 重要な発見

### 1. 変数の変化

以下の変数がどのタイミングで変化したかを確認してください：

EOF

grep -E '変数変化|変更前|変更後' "${MERGED_LOG}" >> "${ANALYSIS_LOG}" || true

cat >> "${ANALYSIS_LOG}" << 'EOF'

### 2. API呼び出しチェーン

EOF

grep -E 'API リクエスト|API レスポンス' "${MERGED_LOG}" >> "${ANALYSIS_LOG}" || true

cat >> "${ANALYSIS_LOG}" << 'EOF'

### 3. Cookie設定

EOF

grep -E 'Cookie' "${MERGED_LOG}" >> "${ANALYSIS_LOG}" || true

cat >> "${ANALYSIS_LOG}" << 'EOF'

### 4. データベース操作

EOF

grep -E 'REDIS|POSTGRESQL|クエリ' "${MERGED_LOG}" >> "${ANALYSIS_LOG}" || true

cat >> "${ANALYSIS_LOG}" << 'EOF'

## パフォーマンス分析

### 所要時間

EOF

# 最初と最後のタイムスタンプを取得
FIRST_TIME=$(grep -oE 'T\+[0-9]+ms' "${MERGED_LOG}" | head -1 | grep -oE '[0-9]+')
LAST_TIME=$(grep -oE 'T\+[0-9]+ms' "${MERGED_LOG}" | tail -1 | grep -oE '[0-9]+')

if [ -n "${FIRST_TIME}" ] && [ -n "${LAST_TIME}" ]; then
  TOTAL_TIME=$((LAST_TIME - FIRST_TIME))
  echo "- 開始: T+${FIRST_TIME}ms" >> "${ANALYSIS_LOG}"
  echo "- 終了: T+${LAST_TIME}ms" >> "${ANALYSIS_LOG}"
  echo "- 合計所要時間: ${TOTAL_TIME}ms" >> "${ANALYSIS_LOG}"
fi

cat >> "${ANALYSIS_LOG}" << 'EOF'

## 次のステップ

1. merged.logを確認し、完全な処理フローを理解する
2. 変数の変化タイミングを確認する
3. API呼び出しの順序を確認する
4. Cookie・セッションの設定タイミングを確認する
5. トレース結果をSSOTに反映する
6. 問題点や落とし穴を明確化する

## 参考ドキュメント

- [実行トレース駆動型SSOT作成手法](/Users/kaneko/hotel-kanri/docs/03_ssot/EXECUTION_TRACE_DRIVEN_SSOT.md)
- [SSOT作成ルール](/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_CREATION_RULES.md)
- [SSOT深度分析](/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_DEPTH_ANALYSIS.md)
EOF

echo -e "${GREEN}✓ 分析レポート作成完了: ${ANALYSIS_LOG}${NC}"
echo ""

# サマリー表示
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}統合完了${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}統合ログ:${NC} ${MERGED_LOG}"
echo -e "${GREEN}分析レポート:${NC} ${ANALYSIS_LOG}"
echo ""

# ログの行数を表示
if [ -f "${MERGED_LOG}" ]; then
  LINE_COUNT=$(wc -l < "${MERGED_LOG}")
  echo -e "${YELLOW}トレースログ行数: ${LINE_COUNT}${NC}"
fi

echo ""
echo -e "${BLUE}次のステップ:${NC}"
echo "1. 統合ログを確認: cat ${MERGED_LOG}"
echo "2. 分析レポートを確認: cat ${ANALYSIS_LOG}"
echo "3. トレース結果をSSOTに反映"
echo ""

