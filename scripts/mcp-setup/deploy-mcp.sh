#!/bin/bash
# deploy-mcp.sh - MCP設定を各リポジトリにデプロイ
#
# 使用方法:
#   ./scripts/mcp-setup/deploy-mcp.sh [WORKSPACE_ROOT]
#
# 例:
#   ./scripts/mcp-setup/deploy-mcp.sh /Users/kaneko
#   ./scripts/mcp-setup/deploy-mcp.sh /home/user

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ワークスペースルートの決定
if [ -n "$1" ]; then
    WORKSPACE_ROOT="$1"
elif [ -n "$HOTEL_WORKSPACE" ]; then
    WORKSPACE_ROOT="$HOTEL_WORKSPACE"
else
    # 自動検出（hotel-kanriの親ディレクトリ）
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    WORKSPACE_ROOT="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"
fi

echo -e "${GREEN}🔧 MCP設定デプロイスクリプト${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ワークスペース: $WORKSPACE_ROOT"
echo ""

# リポジトリ存在確認
REPOS=(
    "hotel-kanri"
    "hotel-common-rebuild"
    "hotel-saas-rebuild"
)

echo -e "${YELLOW}📁 リポジトリ確認中...${NC}"
for repo in "${REPOS[@]}"; do
    if [ -d "$WORKSPACE_ROOT/$repo" ]; then
        echo -e "  ✅ $repo"
    else
        echo -e "  ${RED}❌ $repo (not found)${NC}"
    fi
done
echo ""

# MCP設定テンプレート生成関数
generate_settings() {
    local target_repo="$1"
    cat << EOF
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "$WORKSPACE_ROOT/hotel-kanri",
        "$WORKSPACE_ROOT/hotel-common-rebuild",
        "$WORKSPACE_ROOT/hotel-saas-rebuild"
      ]
    }
  }
}
EOF
}

# hotel-common-rebuild にデプロイ
if [ -d "$WORKSPACE_ROOT/hotel-common-rebuild" ]; then
    echo -e "${GREEN}📦 hotel-common-rebuild にMCP設定をデプロイ...${NC}"
    mkdir -p "$WORKSPACE_ROOT/hotel-common-rebuild/.claude"
    generate_settings "hotel-common-rebuild" > "$WORKSPACE_ROOT/hotel-common-rebuild/.claude/settings.json"
    echo -e "  ✅ .claude/settings.json 作成完了"
else
    echo -e "${YELLOW}⚠️  hotel-common-rebuild が見つかりません。スキップします。${NC}"
fi

# hotel-saas-rebuild にデプロイ
if [ -d "$WORKSPACE_ROOT/hotel-saas-rebuild" ]; then
    echo -e "${GREEN}📦 hotel-saas-rebuild にMCP設定をデプロイ...${NC}"
    mkdir -p "$WORKSPACE_ROOT/hotel-saas-rebuild/.claude"
    generate_settings "hotel-saas-rebuild" > "$WORKSPACE_ROOT/hotel-saas-rebuild/.claude/settings.json"
    echo -e "  ✅ .claude/settings.json 作成完了"
else
    echo -e "${YELLOW}⚠️  hotel-saas-rebuild が見つかりません。スキップします。${NC}"
fi

# hotel-kanri の設定を更新
if [ -d "$WORKSPACE_ROOT/hotel-kanri" ]; then
    echo -e "${GREEN}📦 hotel-kanri のMCP設定を更新...${NC}"
    mkdir -p "$WORKSPACE_ROOT/hotel-kanri/.claude"
    generate_settings "hotel-kanri" > "$WORKSPACE_ROOT/hotel-kanri/.claude/settings.json"
    echo -e "  ✅ .claude/settings.json 作成完了"
fi

echo ""
echo -e "${GREEN}✅ MCP設定のデプロイが完了しました${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "使用方法:"
echo ""
echo "hotel-common-rebuild で実行:"
echo '  MCP filesystemを使って'
echo '  $WORKSPACE_ROOT/hotel-kanri/docs/04_implementation_instructions/PHASE1_COMMON_INSTRUCTIONS.md'
echo '  を読んで実装を開始してください'
echo ""
echo "hotel-saas-rebuild で実行:"
echo '  MCP filesystemを使って'
echo '  $WORKSPACE_ROOT/hotel-kanri/docs/04_implementation_instructions/PHASE2_SAAS_INSTRUCTIONS.md'
echo '  を読んで実装を開始してください'
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
