#!/usr/bin/env bash
set -euo pipefail

# UNIFY-DEV G2: ローカル統合スモーク
# 前提: サービスがローカルで起動済み
# - saas: 3100
# - member API: 3200
# - member UI: 8080 (任意)
# - pms: 3300

TIMEOUT=${TIMEOUT:-5}

check() {
  local name="$1"; local url="$2"
  echo "[CHECK] $name -> $url"
  if curl -sS -m "$TIMEOUT" -o /dev/null -w "%{http_code}\n" "$url" | grep -qE "^(200|204)$"; then
    echo "✅ $name OK"
  else
    echo "❌ $name NG"
  fi
}

echo "== UNIFY-DEV G2 Local Smoke =="
# SaaS は /health 未実装の環境があるため /health → /api/health の順でフォールバック
if curl -sS -m "$TIMEOUT" -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:3100/health" | grep -qE "^(200|204)$"; then
  check "hotel-saas /health"   "http://127.0.0.1:3100/health"
else
  check "hotel-saas /api/health" "http://127.0.0.1:3100/api/health"
fi
check "hotel-member /health" "http://127.0.0.1:3200/health"
check "hotel-pms /health"    "http://127.0.0.1:3300/health"
# 任意（フロントUIが実装されている場合のみ）
check "member UI /health"    "http://127.0.0.1:8080/health" || true

echo "== DONE =="