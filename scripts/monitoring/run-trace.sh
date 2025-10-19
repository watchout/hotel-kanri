#!/bin/bash

##############################################################################
# 実行トレース実行スクリプト
#
# 目的: ログイン機能の完全なトレースを記録し、SSOT作成に活用する
#
# 使用方法:
#   ./scripts/monitoring/run-trace.sh
#
# 実行内容:
#   1. トレース用の環境変数を設定
#   2. hotel-saas と hotel-common を起動
#   3. Redis MONITOR を起動
#   4. ログを記録
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

# ログディレクトリ
LOG_DIR="./logs/trace"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TRACE_LOG_DIR="${LOG_DIR}/${TIMESTAMP}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}実行トレース開始${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ログディレクトリ作成
mkdir -p "${TRACE_LOG_DIR}"
echo -e "${GREEN}✓ ログディレクトリ作成: ${TRACE_LOG_DIR}${NC}"

# 1. 環境変数設定
export NODE_ENV=development
export ENABLE_TRACE=true

echo -e "${GREEN}✓ 環境変数設定完了${NC}"
echo "  NODE_ENV=${NODE_ENV}"
echo "  ENABLE_TRACE=${ENABLE_TRACE}"
echo ""

# 2. hotel-saasの存在確認
if [ ! -d "/Users/kaneko/hotel-saas" ]; then
  echo -e "${RED}✗ hotel-saas ディレクトリが見つかりません${NC}"
  exit 1
fi

# 3. hotel-commonの存在確認
if [ ! -d "/Users/kaneko/hotel-common" ]; then
  echo -e "${RED}✗ hotel-common ディレクトリが見つかりません${NC}"
  exit 1
fi

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}トレース記録の準備${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo -e "${YELLOW}以下の手順でトレースを実行してください：${NC}"
echo ""
echo -e "${BLUE}1. ターミナル1（hotel-common）:${NC}"
echo "   cd /Users/kaneko/hotel-common"
echo "   export NODE_ENV=development"
echo "   export ENABLE_TRACE=true"
echo "   npm run dev 2>&1 | tee ${TRACE_LOG_DIR}/hotel-common.log"
echo ""
echo -e "${BLUE}2. ターミナル2（hotel-saas）:${NC}"
echo "   cd /Users/kaneko/hotel-saas"
echo "   export NODE_ENV=development"
echo "   export ENABLE_TRACE=true"
echo "   npm run dev 2>&1 | tee ${TRACE_LOG_DIR}/hotel-saas.log"
echo ""
echo -e "${BLUE}3. ターミナル3（Redis MONITOR）:${NC}"
echo "   redis-cli MONITOR 2>&1 | tee ${TRACE_LOG_DIR}/redis.log"
echo ""
echo -e "${BLUE}4. ブラウザ:${NC}"
echo "   a) ブラウザの開発者ツールを開く（F12）"
echo "   b) コンソールタブを開く"
echo "   c) 'Preserve log'（ログを保持）をONにする"
echo "   d) http://localhost:3000/admin/login にアクセス"
echo "   e) ログイン実行"
echo "   f) コンソールログを全てコピーして ${TRACE_LOG_DIR}/browser.log に保存"
echo ""
echo -e "${GREEN}5. トレース完了後:${NC}"
echo "   ./scripts/monitoring/merge-trace-logs.sh ${TRACE_LOG_DIR}"
echo ""
echo -e "${YELLOW}========================================${NC}"
echo ""

# README作成
cat > "${TRACE_LOG_DIR}/README.md" << EOF
# 実行トレースログ

## 記録日時
${TIMESTAMP}

## 目的
ログイン機能の完全なトレースを記録し、SSOT作成の精度を向上させる

## ログファイル

- \`hotel-common.log\`: hotel-common（バックエンド）のログ
- \`hotel-saas.log\`: hotel-saas（フロントエンド）のログ
- \`redis.log\`: Redisの操作ログ
- \`browser.log\`: ブラウザコンソールのログ
- \`merged.log\`: 統合された時系列ログ（merge-trace-logs.shで生成）

## ログの見方

各ログは以下の形式で出力されます：

\`\`\`
[TRACE] [T+XXXms] [system] location
[TRACE] [T+XXXms]   └─ action
[TRACE] [T+XXXms]      データ: {...}
\`\`\`

- \`T+XXXms\`: トレース開始からの経過時間
- \`system\`: システム名（browser, hotel-saas, hotel-common, redis, postgresql）
- \`location\`: 処理場所（ファイル名:行番号、関数名等）
- \`action\`: アクション内容
- \`データ\`: 追加データ（オプション）

## 次のステップ

1. ログを確認し、処理フローを理解する
2. トレース結果をSSOTに反映する
3. 問題点や落とし穴を明確化する

## 参考ドキュメント

- [実行トレース駆動型SSOT作成手法](/Users/kaneko/hotel-kanri/docs/03_ssot/EXECUTION_TRACE_DRIVEN_SSOT.md)
- [SSOT作成ルール](/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_CREATION_RULES.md)
EOF

echo -e "${GREEN}✓ README作成完了: ${TRACE_LOG_DIR}/README.md${NC}"
echo ""
echo -e "${BLUE}トレース準備完了！上記の手順に従ってトレースを実行してください。${NC}"

