# MCP Setup for Cross-Repository Access

3リポジトリ間でファイルを相互参照するための MCP (Model Context Protocol) 設定。

## 概要

```
┌─────────────────────────────────────────────────────────────┐
│                    filesystem MCP                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ hotel-kanri │←→│hotel-common │←→│ hotel-saas  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## クイックスタート

```bash
# hotel-kanri ディレクトリで実行
./scripts/mcp-setup/deploy-mcp.sh /Users/kaneko

# または環境変数を設定
export HOTEL_WORKSPACE=/Users/kaneko
./scripts/mcp-setup/deploy-mcp.sh
```

## 手動セットアップ

### 1. hotel-common-rebuild

```bash
mkdir -p .claude
cat > .claude/settings.json << 'EOF'
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/kaneko/hotel-kanri",
        "/Users/kaneko/hotel-common-rebuild",
        "/Users/kaneko/hotel-saas-rebuild"
      ]
    }
  }
}
EOF
```

### 2. hotel-saas-rebuild

```bash
mkdir -p .claude
cat > .claude/settings.json << 'EOF'
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/kaneko/hotel-kanri",
        "/Users/kaneko/hotel-common-rebuild",
        "/Users/kaneko/hotel-saas-rebuild"
      ]
    }
  }
}
EOF
```

## 使用方法

### hotel-common-rebuild で実装指示を読む

Claude に以下のように指示：

```
MCP filesystem を使って
/Users/kaneko/hotel-kanri/docs/04_implementation_instructions/PHASE1_COMMON_INSTRUCTIONS.md
を読んで、指示に従って実装を開始してください。
```

### hotel-saas-rebuild で実装指示を読む

```
MCP filesystem を使って
/Users/kaneko/hotel-kanri/docs/04_implementation_instructions/PHASE2_SAAS_INSTRUCTIONS.md
を読んで、指示に従って実装を開始してください。
```

## トラブルシューティング

### MCP が認識されない

1. Claude Code を再起動
2. `.claude/settings.json` のパスが正しいか確認
3. `npx @modelcontextprotocol/server-filesystem --help` が動作するか確認

### ファイルにアクセスできない

MCP の args に指定したパスが存在するか確認：

```bash
ls -la /Users/kaneko/hotel-kanri
ls -la /Users/kaneko/hotel-common-rebuild
ls -la /Users/kaneko/hotel-saas-rebuild
```

## ファイル構成

```
scripts/mcp-setup/
├── README.md               # このファイル
├── deploy-mcp.sh           # 自動デプロイスクリプト
├── common-settings.json    # hotel-common-rebuild 用テンプレート
└── saas-settings.json      # hotel-saas-rebuild 用テンプレート
```
