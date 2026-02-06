# ローカルCLI セットアップガイド

hotel-kanri、hotel-common-rebuild、hotel-saas-rebuildの3リポジトリを横断してClaude CLIで開発するためのセットアップ手順です。

## 前提条件

- Claude CLI がインストール済み
- 3つのリポジトリが同じ親ディレクトリにある

```
/Users/kaneko/
├── hotel-kanri/
├── hotel-common-rebuild/
└── hotel-saas-rebuild/
```

## 1. シンボリックリンクの作成

hotel-kanriから他リポジトリへのアクセスを設定:

```bash
cd /Users/kaneko/hotel-kanri

# .refs ディレクトリ作成
mkdir -p .refs

# シンボリックリンク作成
ln -s /Users/kaneko/hotel-common-rebuild .refs/hotel-common
ln -s /Users/kaneko/hotel-saas-rebuild .refs/hotel-saas

# 確認
ls -la .refs/
```

## 2. MCP設定

`~/.claude.json` に以下を追加（または既存設定とマージ）:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/kaneko/hotel-kanri",
        "/Users/kaneko/hotel-saas-rebuild",
        "/Users/kaneko/hotel-common-rebuild"
      ]
    }
  }
}
```

## 3. 起動

```bash
cd /Users/kaneko/hotel-kanri
claude
```

## 4. 動作確認

Claude CLI内で以下を確認:

```bash
# hotel-kanri（現在地）
ls docs/03_ssot/

# hotel-common（シンボリックリンク経由）
ls .refs/hotel-common/src/routes/

# hotel-saas（シンボリックリンク経由）
ls .refs/hotel-saas/pages/admin/
```

## 5. エージェントチーム使用

### 開発フロー

```
1. /plan DEV-0xxx     # 計画立案
      ↓
2. /api DEV-0xxx      # hotel-common API実装
      ↓
3. /ui DEV-0xxx       # hotel-saas UI実装
      ↓
4. /integrate DEV-0xxx # 統合確認
      ↓
5. /gate              # 品質ゲート
      ↓
6. PR作成・マージ
```

### コマンド一覧

| コマンド | 役割 | 対象リポジトリ |
|:--------|:-----|:--------------|
| `/ssot` | SSOT作成 | hotel-kanri |
| `/plan` | 計画立案 | hotel-kanri |
| `/api` | API実装 | hotel-common |
| `/ui` | UI実装 | hotel-saas |
| `/integrate` | 統合確認 | 全リポジトリ |
| `/gate` | 品質ゲート | common + saas |
| `/review` | コードレビュー | 指定リポジトリ |
| `/tdd` | TDD | 指定リポジトリ |
| `/impl` | 汎用実装 | 指定リポジトリ |

## 6. 開発サーバー

別ターミナルで起動:

```bash
# Terminal 1: hotel-common
cd /Users/kaneko/hotel-common-rebuild
npm run dev  # Port 3401

# Terminal 2: hotel-saas
cd /Users/kaneko/hotel-saas-rebuild
npm run dev  # Port 3101
```

## 7. トラブルシューティング

### シンボリックリンクが動作しない

```bash
# 絶対パスで再作成
rm -rf .refs
mkdir .refs
ln -s "$(realpath ../hotel-common-rebuild)" .refs/hotel-common
ln -s "$(realpath ../hotel-saas-rebuild)" .refs/hotel-saas
```

### MCPが認識されない

```bash
# Claude CLI再起動
claude --version  # バージョン確認
claude            # 再起動
```

### 権限エラー

```bash
# 読み取り権限確認
ls -la .refs/hotel-common/
ls -la .refs/hotel-saas/
```

## 8. 環境変数（オプション）

`.env.local` に追加:

```bash
# 開発用
HOTEL_COMMON_DIR=/Users/kaneko/hotel-common-rebuild
HOTEL_SAAS_DIR=/Users/kaneko/hotel-saas-rebuild
HOTEL_KANRI_DIR=/Users/kaneko/hotel-kanri

# テストアカウント
TEST_EMAIL=owner@test.omotenasuai.com
TEST_PASSWORD=owner123
```

## 9. チェックリスト

セットアップ完了確認:

- [ ] `.refs/hotel-common` が参照可能
- [ ] `.refs/hotel-saas` が参照可能
- [ ] Claude CLI が hotel-kanri で起動
- [ ] `/api`, `/ui`, `/gate` コマンドが認識される
- [ ] 開発サーバー（3401, 3101）が起動
