# 🔄 API統合マスターチェックリスト

## 📋 概要

このマスターチェックリストは、hotel-saasアプリケーションとhotel-common APIの統合作業全体を管理するためのものです。各APIの詳細なチェックリストは個別のファイルに保存されています。

## 🚨 優先度別API統合ステータス

### フェーズ1: 認証・テナント系API

| API | 優先度 | 状態 | 確認URL | API変更 | ソース変更 | 目視チェック | チェックリスト |
|-----|--------|------|---------|---------|------------|------------|--------------|
| `POST /api/auth/validate` | 最高 | ✅ 完了 | [テスト統合](http://localhost:3100/api/v1/auth/test-integration) | ✅ | ✅ | ✅ | - |
| `GET /api/tenants` | 最高 | ✅ 完了 | [テスト統合](http://localhost:3100/api/v1/auth/test-integration) | ✅ | ✅ | ✅ | - |
| `POST /api/v1/auth/login` | 高 | ✅ 完了 | [ログイン画面](http://localhost:3100/admin/login) | ✅ | ✅ | ✅ | [ログインAPI](./api-integration/LOGIN_API_CHECKLIST.md) |
| `POST /api/v1/auth/refresh` | 高 | ⏳ 進行中 | [トークン更新テスト](http://localhost:3100/api/v1/auth/test-refresh) | ✅ | ✅ | ⏳ | [トークン更新API](./api-integration/TOKEN_REFRESH_API_CHECKLIST.md) |

### フェーズ2: オーダー系API

| API | 優先度 | 状態 | 確認URL | API変更 | ソース変更 | 目視チェック | チェックリスト |
|-----|--------|------|---------|---------|------------|------------|--------------|
| `GET /api/v1/orders/history` | 高 | ⏳ 進行中 | [オーダー履歴テスト](http://localhost:3100/api/v1/orders/test-history?roomId=room-101) | ✅ | ✅ | ⏳ | [オーダー履歴API](./api-integration/ORDERS_HISTORY_API_CHECKLIST.md) |
| `POST /api/v1/orders` | 高 | 🔄 計画中 | [オーダー作成](http://localhost:3100/admin/orders/new) | ❌ | ❌ | ❌ | [オーダー作成API](./api-integration/CREATE_ORDER_API_CHECKLIST.md) |
| `GET /api/v1/orders/active` | 高 | ✅ 完了 | [アクティブオーダー](http://localhost:3100/admin/orders?status=active) | ✅ | ✅ | ✅ | 2025-08-24 |
| `GET /api/v1/orders/{id}` | 高 | ❌ 未着手 | [オーダー詳細](http://localhost:3100/admin/orders/[id]) | ❌ | ❌ | ❌ | - |
| `PUT /api/v1/orders/{id}/status` | 高 | ❌ 未着手 | [ステータス更新](http://localhost:3100/admin/orders/[id]/status) | ❌ | ❌ | ❌ | - |
| `GET /api/v1/order/menu` | 高 | ❌ 未着手 | [メニュー表示](http://localhost:3100/order) | ❌ | ❌ | ❌ | - |

### フェーズ3: 管理画面API

| API | 優先度 | 状態 | 確認URL | API変更 | ソース変更 | 目視チェック | チェックリスト |
|-----|--------|------|---------|---------|------------|------------|--------------|
| `GET /api/v1/admin/summary` | 中 | ❌ 未着手 | [管理画面](http://localhost:3100/admin) | ❌ | ❌ | ❌ | - |
| `GET /api/v1/admin/dashboard/stats` | 中 | ❌ 未着手 | [管理画面](http://localhost:3100/admin) | ❌ | ❌ | ❌ | - |
| `GET /api/v1/admin/devices/count` | 中 | ❌ 未着手 | [管理画面](http://localhost:3100/admin) | ❌ | ❌ | ❌ | - |
| `GET /api/v1/admin/orders/monthly-count` | 中 | ❌ 未着手 | [管理画面](http://localhost:3100/admin) | ❌ | ❌ | ❌ | - |

## 📊 進捗サマリー

| フェーズ | 総数 | 完了 | 進行中 | 計画中 | 未着手 | 進捗率 |
|---------|------|------|--------|--------|--------|--------|
| フェーズ1: 認証・テナント系 | 4 | 3 | 1 | 0 | 0 | 87.5% |
| フェーズ2: オーダー系 | 6 | 0 | 1 | 1 | 4 | 8.3% |
| フェーズ3: 管理画面 | 4 | 0 | 0 | 0 | 4 | 0% |
| フェーズ4: その他API | ~186 | 0 | 0 | 0 | ~186 | 0% |
| **合計** | ~200 | 3 | 2 | 1 | ~194 | 2.5% |

## 📝 統合作業の流れ

各APIの統合作業は以下の手順で行います：

1. **分析**
   - [ ] API仕様の確認
   - [ ] 現在の実装の確認
   - [ ] データ形式の違いの特定

2. **実装**
   - [ ] APIクライアントの追加/更新
   - [ ] エンドポイントの実装/更新
   - [ ] データ変換処理の実装
   - [ ] エラーハンドリングの実装

3. **テスト**
   - [ ] 正常系テスト
   - [ ] 異常系テスト
   - [ ] パフォーマンステスト

4. **目視確認**
   - [ ] 実際のUIでの動作確認
   - [ ] エラー表示の確認
   - [ ] ユーザー体験の確認

5. **デプロイ**
   - [ ] 変更のコミット
   - [ ] 本番環境への適用
   - [ ] 動作監視

## 🧪 テスト環境

- **開発サーバー**: http://localhost:3100
- **hotel-common API**: http://localhost:3400
- **テスト用API**: http://localhost:3100/api/v1/auth/test-integration

## 📅 次のステップ

1. トークン更新API (`POST /api/v1/auth/refresh`) のテストと統合完了
   - テストコマンド: `curl -X POST http://localhost:3100/api/v1/auth/test-refresh`
   - 目視確認 URL: http://localhost:3100/api/v1/auth/test-refresh
2. オーダー履歴API (`GET /api/v1/orders/history`) のテストと統合完了
   - テストコマンド: `curl "http://localhost:3100/api/v1/orders/test-history?roomId=room-101"`
   - 目視確認 URL: http://localhost:3100/api/v1/orders/test-history?roomId=room-101
3. オーダー作成API (`POST /api/v1/orders`) の統合開始
4. 残りのオーダー系APIの統合計画作成

## 📚 関連ドキュメント

- [API統合チェックリスト](./API_INTEGRATION_CHECKLIST.md) - 詳細なAPI一覧
- [API統合計画](./API_INTEGRATION_PLAN.md) - 統合の全体計画
- [統合テスト結果](./INTEGRATION_TEST_RESULTS.md) - テスト結果の記録
- [本番デプロイガイド](./PRODUCTION_DEPLOYMENT_GUIDE.md) - デプロイ手順

---

**作成日**: 2025-08-23
**更新日**: 2025-08-23
**実装者**: AI
