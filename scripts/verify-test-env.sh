#!/bin/bash

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 テスト環境検証を開始します..."

# ========================================
# 1. API疎通確認（最優先）
# ========================================

echo ""
echo "📡 Step 1: API疎通確認"

# hotel-common (3400)
echo -n "  hotel-common (3400): "
if curl -f -s http://localhost:3400/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ 稼働中${NC}"
  COMMON_OK=true
else
  echo -e "${YELLOW}✗ 応答なし${NC}"
  COMMON_OK=false
fi

# hotel-saas (3100)
echo -n "  hotel-saas (3100): "
if curl -f -s http://localhost:3100/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ 稼働中${NC}"
  SAAS_OK=true
else
  echo -e "${YELLOW}✗ 応答なし${NC}"
  SAAS_OK=false
fi

# hotel-pms (3300)
echo -n "  hotel-pms (3300): "
if curl -f -s http://localhost:3300/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ 稼働中${NC}"
  PMS_OK=true
else
  echo -e "${YELLOW}✗ 応答なし${NC}"
  PMS_OK=false
fi

# hotel-member (3200)
echo -n "  hotel-member (3200): "
if curl -f -s http://localhost:3200/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ 稼働中${NC}"
  MEMBER_OK=true
else
  echo -e "${YELLOW}✗ 応答なし${NC}"
  MEMBER_OK=false
fi

# ========================================
# 2. API疎通失敗時のみポート確認
# ========================================

if [ "$COMMON_OK" = false ] || [ "$SAAS_OK" = false ] || [ "$PMS_OK" = false ] || [ "$MEMBER_OK" = false ]; then
  echo ""
  echo "⚠️  Step 2: API疎通失敗 → ポート使用状況確認"
  
  # hotel-common
  if [ "$COMMON_OK" = false ]; then
    echo -n "  ポート 3400: "
    if lsof -ti:3400 > /dev/null 2>&1; then
      echo -e "${YELLOW}使用中（プロセス起動中だがAPI応答なし）${NC}"
      echo "    → hotel-commonのログを確認してください"
    else
      echo -e "${RED}未使用（起動が必要）${NC}"
      echo "    → cd /Users/kaneko/hotel-common && npm run dev"
    fi
  fi
  
  # hotel-saas
  if [ "$SAAS_OK" = false ]; then
    echo -n "  ポート 3100: "
    if lsof -ti:3100 > /dev/null 2>&1; then
      echo -e "${YELLOW}使用中（プロセス起動中だがAPI応答なし）${NC}"
      echo "    → hotel-saasのログを確認してください"
    else
      echo -e "${RED}未使用（起動が必要）${NC}"
      echo "    → cd /Users/kaneko/hotel-saas && npm run dev"
    fi
  fi
  
  # hotel-pms
  if [ "$PMS_OK" = false ]; then
    echo -n "  ポート 3300: "
    if lsof -ti:3300 > /dev/null 2>&1; then
      echo -e "${YELLOW}使用中（プロセス起動中だがAPI応答なし）${NC}"
      echo "    → hotel-pmsのログを確認してください"
    else
      echo -e "${RED}未使用（起動が必要）${NC}"
      echo "    → cd /Users/kaneko/hotel-pms && npm run dev"
    fi
  fi
  
  # hotel-member
  if [ "$MEMBER_OK" = false ]; then
    echo -n "  ポート 3200: "
    if lsof -ti:3200 > /dev/null 2>&1; then
      echo -e "${YELLOW}使用中（プロセス起動中だがAPI応答なし）${NC}"
      echo "    → hotel-memberのログを確認してください"
    else
      echo -e "${RED}未使用（起動が必要）${NC}"
      echo "    → cd /Users/kaneko/hotel-member && npm run dev"
    fi
  fi
else
  echo ""
  echo -e "${GREEN}✓ すべてのAPIが正常に応答しています${NC}"
  echo "  → ポート確認はスキップします（不要）"
fi

# ========================================
# 3. Redis接続確認
# ========================================

echo ""
echo "🔴 Step 3: Redis接続確認"
echo -n "  Redis (6379): "
if redis-cli ping > /dev/null 2>&1; then
  echo -e "${GREEN}✓ 稼働中${NC}"
else
  echo -e "${RED}✗ 起動していません${NC}"
  echo "    → redis-server を起動してください"
fi

# ========================================
# 4. PostgreSQL接続確認
# ========================================

echo ""
echo "🐘 Step 4: PostgreSQL接続確認"
echo -n "  PostgreSQL: "
if psql -d hotel_unified_db -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ 接続成功${NC}"
else
  echo -e "${RED}✗ 接続失敗${NC}"
  echo "    → PostgreSQLが起動しているか確認してください"
fi

# ========================================
# 5. テストデータ確認
# ========================================

echo ""
echo "📊 Step 5: テストデータ確認"

# テストテナント
echo -n "  テストテナント (default): "
TENANT_COUNT=$(psql -d hotel_unified_db -t -c "SELECT COUNT(*) FROM \"Tenant\" WHERE id = 'default';" 2>/dev/null | xargs)
if [ "$TENANT_COUNT" = "1" ]; then
  echo -e "${GREEN}✓ 存在${NC}"
else
  echo -e "${RED}✗ 不在${NC}"
  echo "    → テストテナントを作成してください"
fi

# テストアカウント
echo -n "  テストアカウント (admin@omotenasuai.com): "
STAFF_COUNT=$(psql -d hotel_unified_db -t -c "SELECT COUNT(*) FROM staff WHERE email = 'admin@omotenasuai.com';" 2>/dev/null | xargs)
if [ "$STAFF_COUNT" = "1" ]; then
  echo -e "${GREEN}✓ 存在${NC}"
else
  echo -e "${RED}✗ 不在${NC}"
  echo "    → テストアカウントを作成してください"
fi

# ========================================
# 6. 総合判定
# ========================================

echo ""
echo "========================================="
if [ "$COMMON_OK" = true ] && [ "$SAAS_OK" = true ] && [ "$PMS_OK" = true ] && [ "$MEMBER_OK" = true ]; then
  echo -e "${GREEN}✅ テスト環境は正常です。テストを実行できます。${NC}"
  exit 0
else
  echo -e "${RED}❌ テスト環境に問題があります。上記の指示に従って修正してください。${NC}"
  exit 1
fi
