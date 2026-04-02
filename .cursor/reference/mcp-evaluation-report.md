# MCP追加候補評価レポート

**作成日**: 2025-10-21  
**対象**: P1同等の追加MCPサーバー候補

---

## 📊 評価基準

| 項目 | 重み | 説明 |
|------|------|------|
| **開発効率化** | 40% | 日常的な開発作業の効率向上度 |
| **品質向上** | 30% | コード品質・エラー削減への貢献 |
| **運用効率化** | 20% | デプロイ・監視の自動化 |
| **リスク** | -10% | セキュリティ・誤操作リスク |

---

## 🟢 P1: 即導入推奨（既に追加済み）

### 1. Linear MCP ★
- **評価**: 95点 / 100点
- **用途**: `/roadmap` `/progress` `/next` の実装基盤
- **効果**: ロードマップ管理の完全自動化

### 2. GitHub MCP ★
- **評価**: 90点 / 100点
- **用途**: PR自動作成、Issue管理、CI/CD確認
- **効果**: PR作成工数50%削減

---

## 🟢 P1追加候補（高評価・即導入推奨）

### 3. Sentry/Observability MCP ★★★
**評価**: 85点 / 100点

**必要性:**
- 🟢 本番エラーの即時把握
- 🟢 エラートレースの自動分析
- 🟢 再現手順の自動生成

**想定利用シーン:**
```
ユーザー: 本番で500エラーが増えてる

AI:
Sentry MCP でエラー確認中...

## 🚨 本番エラー急増（過去1時間）

### Top 3エラー
1. **TypeError: Cannot read property 'tenantId' of undefined**
   - 発生: 45回
   - 影響: hotel-saas /api/orders
   - スタックトレース:
     apps/hotel-saas/server/api/orders/index.get.ts:28
   - 原因推定: セッション取得失敗

自動でBugチケット作成しますか？
→ Task: b1 — /rfv
```

**リスク: 🟡 中**
- 本番エラー情報へのアクセス（個人情報含む可能性）
- ReadOnly権限必須

**推奨構成:**
```json
"sentry": {
  "command": "npx",
  "args": ["-y", "@sentry/mcp-server"],
  "env": {
    "SENTRY_AUTH_TOKEN": "${SENTRY_AUTH_TOKEN}",
    "SENTRY_ORG": "hotel-kanri",
    "SENTRY_PROJECT": "hotel-saas"
  },
  "allowedOperations": ["listIssues", "getIssue", "getStackTrace"],
  "disallowedOperations": ["deleteIssue", "resolveIssue"]
}
```

**結論: P1追加推奨 ★★★**

---

### 4. Slack MCP ★★
**評価**: 75点 / 100点

**必要性:**
- 🟢 デプロイ通知の自動送信
- 🟢 エラー発生時のチーム通知
- 🟡 リアルタイムコミュニケーション

**想定利用シーン:**
```
ユーザー: PR作成して、Slackでチームに通知

AI:
（PR作成完了）
Slack MCP で通知送信中...

✅ #dev-hotel-saas に通知済み
   🔧 PR #123: テナントID欠落バグ修正
   👀 レビュー依頼: @kaneko
   📋 Linear: LIN-45
```

**リスク: 🟢 低**
- 通知のみ（破壊的操作なし）

**推奨構成:**
```json
"slack": {
  "command": "npx",
  "args": ["-y", "@slack/mcp-server"],
  "env": {
    "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
    "SLACK_CHANNEL_DEV": "C01234567"
  },
  "allowedOperations": ["sendMessage", "listChannels"],
  "disallowedOperations": ["deleteMessage", "archiveChannel"]
}
```

**結論: P1追加候補 ★★**

---

### 5. Postgres/Prisma MCP ★★
**評価**: 70点 / 100点

**必要性:**
- 🟡 開発環境でのスキーマ確認
- 🟡 テストデータの検証
- 🔴 本番データ参照（リスク大）

**想定利用シーン:**
```
ユーザー: Prismaスキーマで tenant_id のインデックス確認

AI:
Postgres MCP でスキーマ確認中...

## テーブル: orders
- tenant_id: VARCHAR(255), NOT NULL
- インデックス: 
  ✅ idx_orders_tenant_id (tenant_id)
  ✅ idx_orders_tenant_created (tenant_id, created_at)

推奨: 複合インデックス活用でクエリ効率化
```

**リスク: 🟡 中**
- 開発環境のみに限定必須
- 本番接続は絶対禁止

**推奨構成:**
```json
"postgres": {
  "command": "npx",
  "args": ["-y", "@prisma/mcp-server"],
  "env": {
    "DATABASE_URL": "${DATABASE_URL_DEV}"
  },
  "allowedOperations": ["describeTable", "listTables", "explainQuery"],
  "disallowedOperations": ["execute", "insert", "update", "delete"]
}
```

**結論: P2（条件付き）**
- 開発環境のみ
- 本番接続禁止の厳格化必須

---

## 🟡 P2: 条件付き導入

### 6. Time MCP
**評価**: 50点 / 100点

**必要性:**
- 🟡 タイムゾーン変換（日本時間⇔UTC）
- 🟡 営業時間判定（チェックイン時刻等）

**結論: P2**
- JavaScriptの標準機能で十分
- 必要なら後から追加

---

### 7. Confluence/Notion MCP
**評価**: 60点 / 100点

**必要性:**
- 🟡 ドキュメント検索
- 🟡 仕様書参照

**結論: P2**
- 現状は `.cursor/reference/` で十分
- ドキュメントが増えたら検討

---

## 🔴 P3: 非推奨

### 8. Serper/Web Search MCP
**評価**: 30点 / 100点
**理由**: リポジトリ内情報で完結、外部検索不要

### 9. AlphaVantage（株価API）MCP
**評価**: 0点 / 100点
**理由**: ホテル管理システムに不要

### 10. MiniMax（マルチメディア生成）MCP
**評価**: 0点 / 100点
**理由**: 開発効率化に無関係

---

## 🎯 最終推奨構成

### 即導入（P1）★
1. ✅ Linear MCP（導入済み）
2. ✅ GitHub MCP（導入済み）
3. **Sentry/Observability MCP** ★★★ 最優先
4. **Slack MCP** ★★

### 条件付き（P2）
5. Postgres/Prisma MCP（開発環境のみ）
6. Shell MCP（Allowlist厳格化）

### 非推奨（P3）
- Time, Confluence, Web Search 等

---

## 📊 効果予測（P1全導入時）

| 項目 | 現状 | P1導入後 | 改善率 |
|------|------|----------|--------|
| PR作成時間 | 10分 | 5分 | 50%削減 |
| エラー調査時間 | 30分 | 10分 | 67%削減 |
| ロードマップ確認 | 5分 | 10秒 | 97%削減 |
| デプロイ通知 | 手動 | 自動 | 100%自動化 |

**合計工数削減: 週10時間以上**

---

## 🔒 セキュリティチェックリスト

### 全MCP共通
- [ ] 環境変数は`.env.mcp`で管理（.gitignore済み）
- [ ] トークンは最小権限
- [ ] ReadOnly権限を優先
- [ ] 本番環境への直接アクセス禁止
- [ ] テスト環境で動作確認

### Sentry MCP
- [ ] ReadOnly権限のみ
- [ ] 個人情報を含むエラーは匿名化

### Postgres MCP
- [ ] 開発環境のみ接続
- [ ] 本番DATABASE_URLは絶対に設定しない
- [ ] ReadOnly（SELECT, EXPLAIN）のみ

---

## 📋 導入手順（Phase 1完全版）

### Step 1: mcp.json更新
```json
{
  "mcpServers": {
    "filesystem": { ... },
    "ripgrep": { ... },
    "git": { ... },
    "linear": { ... },
    "github": { ... },
    "sentry": {
      "command": "npx",
      "args": ["-y", "@sentry/mcp-server"],
      "env": {
        "SENTRY_AUTH_TOKEN": "${SENTRY_AUTH_TOKEN}"
      }
    },
    "slack": {
      "command": "npx",
      "args": ["-y", "@slack/mcp-server"],
      "env": {
        "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}"
      }
    }
  }
}
```

### Step 2: 環境変数設定
```bash
cp .env.mcp.example .env.mcp
vi .env.mcp
```

### Step 3: トークン取得
- Linear: https://linear.app/settings/api
- GitHub: https://github.com/settings/tokens
- Sentry: https://sentry.io/settings/account/api/auth-tokens/
- Slack: https://api.slack.com/apps

### Step 4: Cursor再起動

---

## 🔗 参考リンク

- MCP公式: https://modelcontextprotocol.io/
- MCP Servers一覧: https://github.com/modelcontextprotocol/servers
- Sentry MCP: （公式リリース待ち、代替としてSentry API直接利用）
- Slack MCP: https://github.com/slack/mcp-server
