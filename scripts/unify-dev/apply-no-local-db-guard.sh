#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then echo "NG: DATABASE_URL not set"; exit 1; fi
echo "$DATABASE_URL" | grep -Eq 'postgresql://hotel_app:.*@' || { echo "NG: user=hotel_app 必須"; exit 1; }
echo "$DATABASE_URL" | grep -Eq '/hotel_unified_db(\?|$)' || { echo "NG: db=hotel_unified_db 必須"; exit 1; }
# localhost禁止。ただしSSHトンネル 5433 のみ許可
if echo "$DATABASE_URL" | grep -Eq '@(localhost|127\.0\.0\.1|\[::1\])'; then
  echo "$DATABASE_URL" | grep -Eq ':(5433)(/|\?|$)' || { echo "NG: ローカルDB禁止（SSHトンネルは5433のみ許可）"; exit 1; }
fi
echo "OK: 統一DB接続"

write_verify() {
  local dir="$1"
  mkdir -p "$dir/scripts"
  cat > "$dir/scripts/verify-db-url.sh" <<'EOS'
#!/usr/bin/env bash
set -euo pipefail
url="${DATABASE_URL:-}"
if [[ -z "${url}" ]]; then echo "NG: DATABASE_URL not set" >&2; exit 1; fi
echo "$url" | grep -Eq 'postgresql://hotel_app:.*@' || { echo "NG: user=hotel_app 必須" >&2; exit 1; }
echo "$url" | grep -Eq '/hotel_unified_db(\?|$)' || { echo "NG: db=hotel_unified_db 必須" >&2; exit 1; }
if echo "$url" | grep -Eq '@(localhost|127\.0\.0\.1|\[::1\])'; then
  echo "$url" | grep -Eq ':(5433)(/|\?|$)' || { echo "NG: ローカルDB禁止（SSHトンネルは5433のみ許可）" >&2; exit 1; }
fi
echo "OK: 統一DB接続"
EOS
  chmod +x "$dir/scripts/verify-db-url.sh"
}

# 1) SaaS (Nuxt, 3100)
SAA=/Users/kaneko/hotel-saas
if [[ -d "$SAA" ]]; then
  write_verify "$SAA"
  if [[ -f "$SAA/package.json" ]]; then
    node -e 'const fs=require("fs"),p="'$SAA'/package.json";let j=JSON.parse(fs.readFileSync(p,"utf8"));j.scripts=j.scripts||{};j.scripts["verify:db"]="bash scripts/verify-db-url.sh";if(j.scripts.dev&&!j.scripts.dev.includes("verify:db")){j.scripts.dev="pnpm run verify:db && "+j.scripts.dev}else if(!j.scripts.dev){j.scripts.dev="pnpm run verify:db && nuxt dev --port 3100 --strictPort"};if(j.scripts.start&&!j.scripts.start.includes("verify:db")){j.scripts.start="pnpm run verify:db && "+j.scripts.start};fs.writeFileSync(p,JSON.stringify(j,null,2))'
  fi
fi

# 2) Member API (FastAPI, 3200)
MEM_API=/Users/kaneko/hotel-member/api
if [[ -d "$MEM_API" ]]; then
  write_verify "$MEM_API"
  mkdir -p "$MEM_API/scripts"
  cat > "$MEM_API/scripts/dev-api.sh" <<'EOS'
#!/usr/bin/env bash
set -euo pipefail
bash "$(dirname "$0")/verify-db-url.sh"
uvicorn app.main:app --host 0.0.0.0 --port 3200 --reload
EOS
  chmod +x "$MEM_API/scripts/dev-api.sh"
fi

# 3) Member UI (Nuxt, 8080)
MEM_UI=/Users/kaneko/hotel-member/ui
if [[ -d "$MEM_UI" ]]; then
  write_verify "$MEM_UI"
  if [[ -f "$MEM_UI/package.json" ]]; then
    node -e 'const fs=require("fs"),p="'$MEM_UI'/package.json";let j=JSON.parse(fs.readFileSync(p,"utf8"));j.scripts=j.scripts||{};j.scripts["verify:db"]="bash scripts/verify-db-url.sh";if(j.scripts.dev&&!j.scripts.dev.includes("verify:db")){j.scripts.dev="pnpm run verify:db && "+j.scripts.dev}else if(!j.scripts.dev){j.scripts.dev="pnpm run verify:db && nuxt dev --port 8080 --strictPort"};fs.writeFileSync(p,JSON.stringify(j,null,2))'
  fi
fi

# 4) PMS (Node, 3300)
PMS=/Users/kaneko/hotel-pms
if [[ -d "$PMS" ]]; then
  write_verify "$PMS"
  if [[ -f "$PMS/package.json" ]]; then
    node -e 'const fs=require("fs"),p="'$PMS'/package.json";let j=JSON.parse(fs.readFileSync(p,"utf8"));j.scripts=j.scripts||{};j.scripts["verify:db"]="bash scripts/verify-db-url.sh";if(j.scripts.dev&&!j.scripts.dev.includes("verify:db")){j.scripts.dev="pnpm run verify:db && "+j.scripts.dev}else if(!j.scripts.dev){j.scripts.dev="pnpm run verify:db && node server.js --port 3300 --strictPort"};fs.writeFileSync(p,JSON.stringify(j,null,2))'
  fi
fi

echo "✅ ガード導入完了"
