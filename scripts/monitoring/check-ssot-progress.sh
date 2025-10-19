#!/bin/bash

##############################################################################
# SSOT進捗確認スクリプト
# 
# 目的: SSOTの作成進捗を自動的に確認し、統一フォーマットで報告する
# 作成日: 2025-10-08
# 更新日: 2025-10-08
# バージョン: 1.0.0
##############################################################################

# カラーコード
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# プロジェクトルート
PROJECT_ROOT="/Users/kaneko/hotel-kanri"
SSOT_DIR="${PROJECT_ROOT}/docs/03_ssot"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗺️  hotel-kanri プロジェクト進捗状況レポート"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📅 確認日時: $(date '+%Y年%m月%d日 %H:%M:%S')"
echo ""

##############################################################################
# 各カテゴリのSSOTファイルをカウント
##############################################################################

count_ssot_files() {
    local dir=$1
    local count=0
    
    if [ -d "$dir" ]; then
        # SSOT_で始まる.mdファイルのみをカウント（reports/やその他補助ファイルを除外）
        count=$(find "$dir" -maxdepth 1 -type f -name "SSOT_*.md" | wc -l | tr -d ' ')
    fi
    
    echo "$count"
}

# 各カテゴリのファイル数をカウント
FOUNDATION_COUNT=$(count_ssot_files "${SSOT_DIR}/00_foundation")
ADMIN_COUNT=$(count_ssot_files "${SSOT_DIR}/01_admin_features")
GUEST_COUNT=$(count_ssot_files "${SSOT_DIR}/02_guest_features")
BUSINESS_COUNT=$(count_ssot_files "${SSOT_DIR}/03_business_features")
MONITORING_COUNT=$(count_ssot_files "${SSOT_DIR}/04_monitoring")

# 合計
TOTAL_CREATED=$((FOUNDATION_COUNT + ADMIN_COUNT + GUEST_COUNT + BUSINESS_COUNT + MONITORING_COUNT))

# 各カテゴリの目標数（固定値）
FOUNDATION_TOTAL=14
ADMIN_TOTAL=20
GUEST_TOTAL=10
BUSINESS_TOTAL=4
MONITORING_TOTAL=4
TOTAL_TARGET=52

# 未作成数
FOUNDATION_REMAINING=$((FOUNDATION_TOTAL - FOUNDATION_COUNT))
ADMIN_REMAINING=$((ADMIN_TOTAL - ADMIN_COUNT))
GUEST_REMAINING=$((GUEST_TOTAL - GUEST_COUNT))
BUSINESS_REMAINING=$((BUSINESS_TOTAL - BUSINESS_COUNT))
MONITORING_REMAINING=$((MONITORING_TOTAL - MONITORING_COUNT))
TOTAL_REMAINING=$((TOTAL_TARGET - TOTAL_CREATED))

# 進捗率計算
FOUNDATION_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($FOUNDATION_COUNT/$FOUNDATION_TOTAL)*100}")
ADMIN_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($ADMIN_COUNT/$ADMIN_TOTAL)*100}")
GUEST_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($GUEST_COUNT/$GUEST_TOTAL)*100}")
BUSINESS_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($BUSINESS_COUNT/$BUSINESS_TOTAL)*100}")
MONITORING_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($MONITORING_COUNT/$MONITORING_TOTAL)*100}")
TOTAL_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($TOTAL_CREATED/$TOTAL_TARGET)*100}")

##############################################################################
# 進捗バー生成関数
##############################################################################

generate_progress_bar() {
    local percent=$1
    local width=20
    local filled=$(awk "BEGIN {printf \"%.0f\", ($percent/100)*$width}")
    local empty=$((width - filled))
    
    local bar=""
    for ((i=0; i<filled; i++)); do
        bar="${bar}■"
    done
    for ((i=0; i<empty; i++)); do
        bar="${bar}□"
    done
    
    echo "$bar"
}

##############################################################################
# 総合進捗表示
##############################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 総合進捗状況"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 総合進捗: ${TOTAL_PERCENT}% 完成"
echo ""
echo "$(generate_progress_bar $TOTAL_PERCENT)  ${TOTAL_PERCENT}%"
echo ""
echo "| カテゴリ              | 作成済み | 未作成 | 合計 | 進捗率    |"
echo "|----------------------|----------|--------|------|-----------|"
printf "| 00_foundation/       | %-8s | %-6s | %-4s | %-9s |\n" "$FOUNDATION_COUNT" "$FOUNDATION_REMAINING" "$FOUNDATION_TOTAL" "${FOUNDATION_PERCENT}%"
printf "| 01_admin_features/   | %-8s | %-6s | %-4s | %-9s |\n" "$ADMIN_COUNT" "$ADMIN_REMAINING" "$ADMIN_TOTAL" "${ADMIN_PERCENT}%"
printf "| 02_guest_features/   | %-8s | %-6s | %-4s | %-9s |\n" "$GUEST_COUNT" "$GUEST_REMAINING" "$GUEST_TOTAL" "${GUEST_PERCENT}%"
printf "| 03_business_features/| %-8s | %-6s | %-4s | %-9s |\n" "$BUSINESS_COUNT" "$BUSINESS_REMAINING" "$BUSINESS_TOTAL" "${BUSINESS_PERCENT}%"
printf "| 04_monitoring/       | %-8s | %-6s | %-4s | %-9s |\n" "$MONITORING_COUNT" "$MONITORING_REMAINING" "$MONITORING_TOTAL" "${MONITORING_PERCENT}%"
echo "|----------------------|----------|--------|------|-----------|"
printf "| ${BLUE}合計${NC}                 | ${GREEN}%-8s${NC} | ${RED}%-6s${NC} | %-4s | ${GREEN}%-9s${NC} |\n" "$TOTAL_CREATED" "$TOTAL_REMAINING" "$TOTAL_TARGET" "${TOTAL_PERCENT}%"
echo ""

##############################################################################
# カテゴリ別詳細表示
##############################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 カテゴリ別詳細"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 00_foundation/
echo "📁 00_foundation/ - ${FOUNDATION_COUNT}件作成済み (${FOUNDATION_PERCENT}%)"
echo ""
if [ -d "${SSOT_DIR}/00_foundation" ]; then
    find "${SSOT_DIR}/00_foundation" -maxdepth 1 -type f -name "SSOT_*.md" | sort | while read -r file; do
        basename "$file" | sed 's/^/  ✅ /'
    done
fi
echo ""

# 01_admin_features/
echo "📁 01_admin_features/ - ${ADMIN_COUNT}件作成済み (${ADMIN_PERCENT}%)"
echo ""
if [ -d "${SSOT_DIR}/01_admin_features" ]; then
    find "${SSOT_DIR}/01_admin_features" -maxdepth 1 -type f -name "SSOT_*.md" | sort | while read -r file; do
        basename "$file" | sed 's/^/  ✅ /'
    done
fi
echo ""

# 02_guest_features/
echo "📁 02_guest_features/ - ${GUEST_COUNT}件作成済み (${GUEST_PERCENT}%)"
echo ""
if [ -d "${SSOT_DIR}/02_guest_features" ]; then
    find "${SSOT_DIR}/02_guest_features" -maxdepth 1 -type f -name "SSOT_*.md" | sort | while read -r file; do
        basename "$file" | sed 's/^/  ✅ /'
    done
else
    echo "  ⚠️  フォルダが存在しません"
fi
echo ""

# 03_business_features/
echo "📁 03_business_features/ - ${BUSINESS_COUNT}件作成済み (${BUSINESS_PERCENT}%)"
echo ""
if [ -d "${SSOT_DIR}/03_business_features" ]; then
    if [ "$BUSINESS_COUNT" -eq 0 ]; then
        echo "  ❌ フォルダは空です"
    else
        find "${SSOT_DIR}/03_business_features" -maxdepth 1 -type f -name "SSOT_*.md" | sort | while read -r file; do
            basename "$file" | sed 's/^/  ✅ /'
        done
    fi
else
    echo "  ⚠️  フォルダが存在しません"
fi
echo ""

# 04_monitoring/
echo "📁 04_monitoring/ - ${MONITORING_COUNT}件作成済み (${MONITORING_PERCENT}%)"
echo ""
if [ -d "${SSOT_DIR}/04_monitoring" ]; then
    if [ "$MONITORING_COUNT" -eq 0 ]; then
        echo "  ❌ フォルダは空です"
    else
        find "${SSOT_DIR}/04_monitoring" -maxdepth 1 -type f -name "SSOT_*.md" | sort | while read -r file; do
            basename "$file" | sed 's/^/  ✅ /'
        done
    fi
else
    echo "  ⚠️  フォルダが存在しません"
fi
echo ""

##############################################################################
# MVP・Phase別進捗状況
##############################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Phase別進捗状況"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# MVPチェック（主要12件のSSOT）
MVP_REQUIRED=(
    "SSOT_SAAS_AUTHENTICATION.md"
    "SSOT_SAAS_ADMIN_AUTHENTICATION.md"
    "SSOT_SAAS_DEVICE_AUTHENTICATION.md"
    "SSOT_SAAS_MULTITENANT.md"
    "SSOT_SAAS_DATABASE_SCHEMA.md"
    "SSOT_SAAS_DASHBOARD.md"
    "SSOT_SAAS_ORDER_MANAGEMENT.md"
    "SSOT_SAAS_MENU_MANAGEMENT.md"
    "SSOT_SAAS_ROOM_MANAGEMENT.md"
    "SSOT_SAAS_FRONT_DESK_OPERATIONS.md"
    "SSOT_ADMIN_BASIC_SETTINGS.md"
    "SSOT_GUEST_ROOM_SERVICE_UI.md"
)

MVP_COMPLETED=0
for ssot in "${MVP_REQUIRED[@]}"; do
    if [ -f "${SSOT_DIR}/00_foundation/${ssot}" ] || \
       [ -f "${SSOT_DIR}/01_admin_features/${ssot}" ] || \
       [ -f "${SSOT_DIR}/02_guest_features/${ssot}" ]; then
        MVP_COMPLETED=$((MVP_COMPLETED + 1))
    fi
done

MVP_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($MVP_COMPLETED/12)*100}")

echo "✅ MVP完成状況: ${MVP_COMPLETED}/12 (${MVP_PERCENT}%)"
echo "$(generate_progress_bar $MVP_PERCENT)  ${MVP_PERCENT}%"
echo ""

# Phase 1チェック（6件）
PHASE1_REQUIRED=(
    "SSOT_SAAS_SUPER_ADMIN.md"
    "SSOT_ADMIN_SYSTEM_LOGS.md"
    "SSOT_ADMIN_BILLING.md"
    "SSOT_SAAS_PERMISSION_SYSTEM.md"
    "SSOT_SAAS_MEDIA_MANAGEMENT.md"
    "SSOT_SAAS_PAYMENT_INTEGRATION.md"
)

PHASE1_COMPLETED=0
for ssot in "${PHASE1_REQUIRED[@]}"; do
    if [ -f "${SSOT_DIR}/00_foundation/${ssot}" ] || \
       [ -f "${SSOT_DIR}/01_admin_features/${ssot}" ]; then
        PHASE1_COMPLETED=$((PHASE1_COMPLETED + 1))
    fi
done

PHASE1_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($PHASE1_COMPLETED/6)*100}")

echo "🔴 Phase 1（基盤完成）: ${PHASE1_COMPLETED}/6 (${PHASE1_PERCENT}%)"
echo "$(generate_progress_bar $PHASE1_PERCENT)  ${PHASE1_PERCENT}%"
echo ""

##############################################################################
# マイルストーン情報
##############################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📅 マイルストーン状況"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# MVP稼働率推定（MVPが完成している場合は70%）
if [ "$MVP_COMPLETED" -eq 12 ]; then
    CURRENT_UPTIME="70%"
    echo "✅ M0: MVP完成 - 稼働率 ${CURRENT_UPTIME}"
else
    CURRENT_UPTIME="60%"
    echo "🟡 M0: MVP - 稼働率 ${CURRENT_UPTIME} (未完成)"
fi
echo "⏳ M0.5: Phase 0完了 - 目標: 2025/10/14 - 稼働率 90%"
echo "⏳ M1: Phase 1完了 - 目標: 2025/10/28 - 稼働率 92% (進捗: ${PHASE1_PERCENT}%)"
echo "⏳ M2: Phase 2完了 - 目標: 2025/11/18 - 稼働率 95%"
echo "⏳ M3: Phase 3完了 - 目標: 2025/12/02 - 稼働率 97%"
echo "⏳ M4: Phase 4完了 - 目標: 2025/12/09 - 稼働率 98%"
echo "⏳ M5: Phase 5完了 - 目標: 2025/12/16 - 稼働率 100% 🎉"
echo ""

##############################################################################
# サマリー
##############################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 サマリー"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ 作成済みSSO: ${TOTAL_CREATED}件"
echo "⏳ 残りSSOT: ${TOTAL_REMAINING}件"
echo "🎯 総合進捗: ${TOTAL_PERCENT}%"
echo "📊 現在の稼働率: ${CURRENT_UPTIME}"
echo ""
echo "🎉 目標: 2025年12月16日までに100%稼働達成！"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "レポート生成完了"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

