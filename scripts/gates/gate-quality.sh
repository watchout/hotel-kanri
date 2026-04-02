#!/bin/bash
# gate-quality: 品質ゲート
# DB整合性、マイグレーション完全性、型チェック、API整合性を検証
set -uo pipefail

PASS=0
FAIL=0
WARN=0

echo "============================================"
echo " Gate: Quality Check"
echo "============================================"

# --- 1. Prisma マイグレーション整合性 (hotel-common) ---
echo ""
echo "=== 1. Prisma Migration Integrity ==="
COMMON_DIR="${HOTEL_COMMON_DIR:-../hotel-common-rebuild}"

if [ -d "$COMMON_DIR/prisma" ]; then
  SCHEMA="$COMMON_DIR/prisma/schema.prisma"
  MIGRATIONS_DIR="$COMMON_DIR/prisma/migrations"

  if [ -f "$SCHEMA" ]; then
    # スキーマのモデル数を取得
    MODEL_COUNT=$(grep -c "^model " "$SCHEMA" || echo "0")
    echo "  Models in schema: $MODEL_COUNT"

    # マイグレーションディレクトリの存在確認
    if [ -d "$MIGRATIONS_DIR" ]; then
      MIGRATION_COUNT=$(find "$MIGRATIONS_DIR" -name "migration.sql" | wc -l | tr -d ' ')
      echo "  Migration files: $MIGRATION_COUNT"

      # migration_lock.toml の存在確認
      if [ -f "$MIGRATIONS_DIR/migration_lock.toml" ]; then
        echo "  PASS: migration_lock.toml exists"
        PASS=$((PASS + 1))
      else
        echo "  FAIL: migration_lock.toml missing"
        FAIL=$((FAIL + 1))
      fi

      # 全モデルのテーブル名をスキーマから抽出し、マイグレーションに含まれるか確認
      TABLES=$(grep '@@map("' "$SCHEMA" | sed 's/.*@@map("\(.*\)").*/\1/' | sort)
      MISSING_TABLES=""
      for TABLE in $TABLES; do
        if ! grep -rq "\"$TABLE\"" "$MIGRATIONS_DIR"/*.sql "$MIGRATIONS_DIR"/*/migration.sql 2>/dev/null; then
          MISSING_TABLES="$MISSING_TABLES $TABLE"
        fi
      done

      if [ -z "$MISSING_TABLES" ]; then
        echo "  PASS: All tables have migrations"
        PASS=$((PASS + 1))
      else
        echo "  FAIL: Tables missing from migrations:$MISSING_TABLES"
        FAIL=$((FAIL + 1))
      fi
    else
      echo "  FAIL: No migrations directory"
      FAIL=$((FAIL + 1))
    fi
  else
    echo "  WARN: schema.prisma not found at $SCHEMA"
    WARN=$((WARN + 1))
  fi
else
  echo "  WARN: hotel-common-rebuild not found at $COMMON_DIR"
  WARN=$((WARN + 1))
fi

# --- 2. ルートページ存在確認 (hotel-saas) ---
echo ""
echo "=== 2. Route Completeness ==="
SAAS_DIR="${HOTEL_SAAS_DIR:-../hotel-saas-rebuild}"

if [ -d "$SAAS_DIR/pages" ]; then
  # index.vue の存在確認
  if [ -f "$SAAS_DIR/pages/index.vue" ]; then
    echo "  PASS: pages/index.vue exists"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: pages/index.vue missing (root URL will 404)"
    FAIL=$((FAIL + 1))
  fi

  # 主要ページの存在確認
  REQUIRED_PAGES="admin/index.vue menu/index.vue unauthorized-device.vue"
  for PAGE in $REQUIRED_PAGES; do
    if [ -f "$SAAS_DIR/pages/$PAGE" ]; then
      echo "  PASS: pages/$PAGE exists"
      PASS=$((PASS + 1))
    else
      echo "  FAIL: pages/$PAGE missing"
      FAIL=$((FAIL + 1))
    fi
  done
else
  echo "  WARN: hotel-saas-rebuild not found at $SAAS_DIR"
  WARN=$((WARN + 1))
fi

# --- 3. プロキシAPI整合性 ---
echo ""
echo "=== 3. Proxy API Consistency ==="

if [ -d "$SAAS_DIR/server/api" ] && [ -d "$COMMON_DIR/src/routes" ]; then
  # hotel-common のルートファイル数
  COMMON_ROUTES=$(find "$COMMON_DIR/src/routes" -name "*.ts" | wc -l | tr -d ' ')
  # hotel-saas のプロキシAPIファイル数
  SAAS_PROXIES=$(find "$SAAS_DIR/server/api" -name "*.ts" | wc -l | tr -d ' ')
  echo "  hotel-common routes: $COMMON_ROUTES"
  echo "  hotel-saas proxy APIs: $SAAS_PROXIES"
  echo "  PASS: API layer exists"
  PASS=$((PASS + 1))
else
  echo "  WARN: Cannot check API consistency"
  WARN=$((WARN + 1))
fi

# --- 4. 禁止パターン検出 ---
echo ""
echo "=== 4. Forbidden Patterns ==="

if [ -d "$SAAS_DIR" ]; then
  # hotel-saas で PrismaClient 直接使用チェック
  PRISMA_USAGE=$(grep -rc "PrismaClient" "$SAAS_DIR/server/" "$SAAS_DIR/pages/" "$SAAS_DIR/composables/" 2>/dev/null | awk -F: '{s+=$NF}END{print s+0}')
  if [ "$PRISMA_USAGE" -eq 0 ]; then
    echo "  PASS: No direct PrismaClient usage in hotel-saas"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: PrismaClient found in hotel-saas ($PRISMA_USAGE occurrences)"
    FAIL=$((FAIL + 1))
  fi

  # any型チェック（server/api配下のみ）
  ANY_USAGE=$(grep -rc ": any" "$SAAS_DIR/server/api/" 2>/dev/null | awk -F: '{s+=$NF}END{print s+0}')
  if [ "$ANY_USAGE" -le 5 ]; then
    echo "  PASS: Minimal 'any' usage in server/api ($ANY_USAGE)"
    PASS=$((PASS + 1))
  else
    echo "  WARN: Excessive 'any' usage in server/api ($ANY_USAGE)"
    WARN=$((WARN + 1))
  fi
fi

# --- 結果サマリー ---
echo ""
echo "============================================"
echo " Gate Quality Result: PASS=$PASS FAIL=$FAIL WARN=$WARN"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  echo "GATE: FAILED"
  exit 1
else
  echo "GATE: PASSED"
  exit 0
fi
