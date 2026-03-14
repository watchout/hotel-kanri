# API ルート品質ガイドライン

## 📋 概要

hotel-commonプロジェクトでは、RESTful API設計の一貫性と保守性を保つため、API ルート品質チェックシステムを導入しています。

## 🎯 目的

1. **一貫性の確保**: 全APIで統一された設計パターンの採用
2. **保守性の向上**: 理解しやすく、拡張しやすいAPI構造
3. **問題の早期発見**: 開発段階での設計問題の自動検出
4. **品質の自動化**: CI/CDパイプラインでの品質保証

## ✅ 推奨パターン

### 基本的なRESTfulパターン
```http
GET    /api/v1/resources           # 一覧取得
GET    /api/v1/resources/:id       # 個別取得
POST   /api/v1/resources           # 作成
PUT    /api/v1/resources/:id       # 更新
DELETE /api/v1/resources/:id       # 削除
```

### クエリパラメータでのフィルタリング
```http
GET /api/v1/resources?category=value&status=active&page=1&limit=20
```

### サブリソースの操作
```http
POST   /api/v1/resources/:id/actions/publish
GET    /api/v1/resources/:id/relationships/items
```

## ❌ 避けるべきパターン

### 1. 複数の動的パラメータが連続
```http
❌ GET /api/v1/rooms/:roomNumber/memos/:memoId
✅ GET /api/v1/room-memos/:id?room_number=101
```

### 2. URLに動詞を含む
```http
❌ POST /api/v1/resources/create
❌ GET  /api/v1/resources/get/:id
✅ POST /api/v1/resources
✅ GET  /api/v1/resources/:id
```

### 3. 深いネスト構造
```http
❌ GET /api/v1/hotels/:id/floors/:floorId/rooms/:roomId
✅ GET /api/v1/rooms/:id
✅ GET /api/v1/rooms?hotel_id=123&floor_id=456
```

### 4. 一貫性のないケース
```http
❌ /api/v1/room_memos
❌ /api/v1/roomMemos
✅ /api/v1/room-memos
```

## 🔧 自動チェックツール

### 1. 品質チェック実行
```bash
# 全APIルートをチェック
npm run check-api-routes

# 特定ディレクトリのみ
npx ts-node scripts/check-api-routes.ts src/routes/specific
```

### 2. 自動修正（可能な場合）
```bash
npm run fix-api-routes
```

### 3. 継続的監視
```bash
# 開発中の継続監視
npm run api-monitor:continuous

# ヘルスチェック
npm run api-health
```

## 📊 チェック項目

### エラー（修正必須）
- ✅ 複数の動的パラメータが連続
- ✅ 深いネスト構造（3層以上）
- ✅ 非RESTful設計

### 警告（修正推奨）
- ⚠️ URLに動詞が含まれる
- ⚠️ RESTful設計に準拠していない

### 情報（改善提案）
- ℹ️ パスが長すぎる（6セグメント超）
- ℹ️ ケースの一貫性

## 🚀 CI/CD統合

### GitHub Actions
プルリクエスト時に自動でAPI品質チェックが実行されます：

```yaml
# .github/workflows/api-quality-check.yml
- name: API ルート品質チェック
  run: npm run check-api-routes
```

### Pre-commit Hook
コミット前に自動チェックが実行されます：

```bash
# .husky/pre-commit
npm run check-api-routes
```

## 📋 修正手順

### 1. 問題の特定
```bash
npm run check-api-routes
```

### 2. 自動修正の試行
```bash
npm run fix-api-routes
```

### 3. 手動修正
レポートの提案に従って手動で修正

### 4. 再チェック
```bash
npm run check-api-routes
```

### 5. テスト実行
```bash
npm test
```

## 🎯 ベストプラクティス

### 1. リソース指向設計
- URLは名詞のみ使用
- HTTPメソッドで操作を表現
- 階層は最小限に抑制

### 2. 一貫性の維持
- ケバブケース（ハイフン）で統一
- 複数形でリソース名を表現
- バージョニングの統一

### 3. 拡張性の考慮
- クエリパラメータでフィルタリング
- ページネーション対応
- 将来の機能追加を考慮した設計

### 4. セキュリティ
- 認証が必要なエンドポイントの明確化
- 権限チェックの統一
- 入力値検証の徹底

## 📚 参考資料

- [RESTful API Design Guidelines](https://restfulapi.net/)
- [HTTP Status Codes](https://httpstatuses.com/)
- [API Design Patterns](https://microservice-api-patterns.org/)

## 🔄 更新履歴

- 2025-09-11: 初版作成、自動チェックシステム導入
- 2025-09-11: 問題のあるルート修正完了（page-history API）
