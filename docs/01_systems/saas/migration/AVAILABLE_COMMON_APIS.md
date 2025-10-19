# 🟢 hotel-common 利用可能API一覧

## **📋 利用可能なAPIエンドポイント**

hotel-commonサーバー（ポート3400）で現在利用可能なAPIエンドポイントは以下の通りです：

```yaml
# 基本システム系
GET  /health                                 # ヘルスチェック
GET  /api/systems/status                     # システムステータス
POST /api/systems/:systemName/test           # システムテスト
GET  /api/database/test                      # データベーステスト
GET  /api/tenants                            # テナント一覧
GET  /api/stats                              # 統計情報

# 認証系
POST /api/auth/validate                      # トークン検証

# hotel-member統合系
GET  /api/hotel-member/integration/health    # hotel-member統合ヘルスチェック
POST /api/hotel-member/hierarchy/auth/verify # 階層認証検証
POST /api/hotel-member/hierarchy/permissions/check-customer-access      # 顧客アクセス権限チェック
POST /api/hotel-member/hierarchy/tenants/accessible                    # アクセス可能テナント
POST /api/hotel-member/hierarchy/permissions/check-membership-restrictions # メンバーシップ制限チェック
POST /api/hotel-member/hierarchy/permissions/check-analytics-access     # 分析アクセス権限チェック
POST /api/hotel-member/hierarchy/user/permissions-detail               # ユーザー権限詳細
POST /api/hotel-member/hierarchy/permissions/batch-check               # 一括権限チェック
GET  /api/hotel-member/hierarchy/health                               # 階層ヘルスチェック

# ページ管理系
GET  /api/v1/admin/pages/:slug               # 管理ページ取得
POST /api/v1/admin/pages/:slug               # 管理ページ更新
POST /api/v1/admin/pages/:slug/publish       # 管理ページ公開
GET  /api/v1/admin/pages/:slug/history       # 管理ページ履歴
GET  /api/v1/admin/pages/:slug/history/:version # 管理ページ特定バージョン
POST /api/v1/admin/pages/:slug/restore       # 管理ページ復元
GET  /api/v1/pages/:slug                     # ページ取得
```

## **🔄 MISSING_COMMON_APIsとのマッピング**

`docs/migration/MISSING_COMMON_APIS.md`に記載されている必要なAPIと、現在利用可能なAPIのマッピングは以下の通りです：

### **✅ 利用可能なAPI**

| 必要なAPI | 利用可能なAPI | 状態 |
|----------|--------------|------|
| 認証トークン検証 | `POST /api/auth/validate` | ✅ 利用可能 |
| テナント情報 | `GET /api/tenants` | ✅ 利用可能 |
| 統合ヘルスチェック | `GET /api/hotel-member/integration/health` | ✅ 利用可能 |

### **🚫 不足しているAPI**

以下のAPIは現在のhotel-commonでは提供されていません：

#### **🚨 最優先実装必須API**
```yaml
# 認証・セキュリティ系
POST /api/v1/auth/login                    # ログイン処理
GET  /api/v1/auth/validate-token           # トークン検証（別形式）
POST /api/v1/auth/refresh                  # トークン更新
GET  /api/v1/tenants/{id}                  # 特定テナント情報取得
GET  /api/v1/staff/{id}                    # スタッフ情報取得
POST /api/v1/integration/validate-token    # 統合トークン検証

# 管理画面必須API
GET  /api/v1/admin/summary                 # サマリー統計
GET  /api/v1/admin/dashboard/stats         # ダッシュボード統計
GET  /api/v1/admin/devices/count           # デバイス数
GET  /api/v1/admin/orders/monthly-count    # 月次注文数
GET  /api/v1/admin/rankings                # ランキング
GET  /api/v1/admin/statistics/kpis         # KPI統計
```

#### **🔥 高優先度API**
```yaml
# 注文・メニュー系
GET  /api/v1/orders/history               # 注文履歴
POST /api/v1/orders                       # 注文作成
GET  /api/v1/orders/active                # アクティブ注文
GET  /api/v1/orders/{id}                  # 注文詳細
PUT  /api/v1/orders/{id}/status           # 注文ステータス更新
GET  /api/v1/menus/top                    # トップメニュー
GET  /api/v1/order/menu                   # メニュー一覧
```

## **🎯 次のステップ**

1. **認証系の統合**
   - 既存の `POST /api/auth/validate` を使用して認証機能を統合
   - 必要に応じてhotel-saas側でアダプターを実装

2. **テナント情報の統合**
   - 既存の `GET /api/tenants` を使用してテナント情報を取得

3. **不足しているAPIの代替実装**
   - 最優先APIについては、hotel-saas側でモック実装を継続
   - hotel-common側での実装を待つ

4. **段階的移行計画**
   - 認証系 → テナント系 → 注文系 の順で移行
   - 各APIの移行後に動作確認を実施

## **📊 移行優先度マトリックス**

| 優先度 | カテゴリ | 利用可能API | 不足API | 対応方針 |
|--------|----------|------------|---------|----------|
| 🚨 最優先 | 認証系 | 1個 | 5個 | 既存API活用 + モック継続 |
| 🔥 高優先 | テナント系 | 1個 | 1個 | 既存API活用 |
| 🔥 高優先 | 注文系 | 0個 | 7個 | モック継続 |
| ⚡ 中優先 | 統計系 | 1個 | 6個 | モック継続 |

---
**作成日時**: 2025-08-22
**更新履歴**: 初回作成
