# クイックリファレンス

## 🚀 開発開始時の必須チェックリスト

### 1. RAGシステム実行（必須）
```bash
npm run simple-rag
npm run practical
npm run guardrails:validate
```

### 2. データベース安全確認
```bash
# ✅ 推奨コマンド
pnpm db:backup
pnpm db:status
pnpm db:safe-generate

# 🚫 絶対禁止
# npx prisma migrate reset
# npx prisma db push --force-reset
```

### 3. 統一ルール確認
- [統一開発ルール](00_shared/standards/unified-development-rules.md)
- [AIエージェントルール](00_shared/standards/ai-agent-rules.md)

## 📋 システム別クイックアクセス

### hotel-saas (Sun - 天照大神)
- **特性**: 明るく温かい・顧客サービス・UI/UX重視
- **ポート**: 3000
- **DB**: SQLite (dev) / PostgreSQL (prod)
- **主要ドキュメント**: [プロジェクトルール](01_systems/saas/development/project-rules.md)

### hotel-pms (Luna - 月読命)
- **特性**: 冷静沈着・効率重視・24時間業務
- **ポート**: 3100
- **DB**: PostgreSQL
- **主要ドキュメント**: [開発管理シート](01_systems/pms/temp-pms-docs/development-management-sheet.md)

### hotel-member (Suno - 須佐之男)
- **特性**: 力強い・セキュリティ重視・プライバシー保護
- **ポート**: 3200 (API), 8080 (管理画面)
- **DB**: PostgreSQL
- **主要ドキュメント**: [開発ルール](01_systems/member/temp-member-docs/.cursor/rules/rules.md)

### hotel-common (Iza - 伊邪那岐)
- **特性**: 冷静分析・統合管理・アーキテクチャ
- **ポート**: 3300
- **DB**: PostgreSQL
- **主要ドキュメント**: [統一認証基盤](00_shared/architecture/unified-authentication-infrastructure-design.md)

## 🔄 システム間連携

### API連携
- [システム間API連携仕様](02_integration/apis/system-api-integration.md)
- 全APIリクエストに`Authorization: Bearer <JWT>`必須
- 全APIリクエストに`X-Tenant-ID: <TENANT_ID>`必須

### イベント連携
- [イベント駆動アーキテクチャ](02_integration/events/event-driven-architecture.md)
- 顧客情報更新時は`customer.updated`イベント必須発行
- ポイント操作時は履歴テーブル記録必須

## 🚫 絶対禁止事項

### データベース
```bash
# 🚫 これらのコマンドは絶対実行禁止
npx prisma migrate reset
npx prisma db push --force-reset
DROP DATABASE *;
TRUNCATE TABLE *;
DELETE FROM * WHERE 1=1;
```

### 認証
- 独自認証システムの実装禁止
- JWT以外の認証方式の新規導入禁止

### UI/UX
```html
<!-- 🚫 禁止 -->
<Icon name="pencil" />
<Icon name="mdi:pencil" />

<!-- ✅ 正しい -->
<Icon name="heroicons:pencil-square" />
```

### 開発プロセス
- ハルシネーション（事実でない情報の提供）禁止
- 仕様外機能の独自実装禁止
- tenant_id無しでのデータアクセス禁止

## 🔧 よく使うコマンド

### 開発環境
```bash
# 開発サーバー起動
pnpm dev

# データベース操作
pnpm db:backup
pnpm db:status
pnpm db:safe-push
pnpm db:studio

# テスト実行
pnpm test
pnpm test:integration
```

### Docker操作
```bash
# 統合環境起動
docker-compose -f docker-compose.unified.yml up -d

# 個別システム起動
docker-compose up hotel-saas
docker-compose up hotel-pms
docker-compose up hotel-member
```

## 📞 緊急時対応

### データ消失時
```bash
# 最新バックアップから復旧
cp ./prisma/dev.db.emergency.backup.YYYYMMDD_HHMMSS ./prisma/dev.db

# データ確認
pnpm db:status
```

### システム整合性確認
```bash
npx prisma generate
pnpm dev:restart
```

## 📚 重要ドキュメント

### 必読
1. [統一開発ルール](00_shared/standards/unified-development-rules.md)
2. [システム間API連携仕様](02_integration/apis/system-api-integration.md)
3. [イベント駆動アーキテクチャ](02_integration/events/event-driven-architecture.md)

### システム別
- **hotel-saas**: [01_systems/saas/](01_systems/saas/)
- **hotel-pms**: [01_systems/pms/](01_systems/pms/)
- **hotel-member**: [01_systems/member/](01_systems/member/)
- **hotel-common**: [01_systems/common/](01_systems/common/)

---

**最終更新**: 2025-09-12  
**クイックアクセス**: このドキュメントをブックマークして開発時に参照してください
