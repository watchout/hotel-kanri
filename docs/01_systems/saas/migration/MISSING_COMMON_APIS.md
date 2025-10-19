# 🚨 hotel-common 不足API実装リスト

## **📋 ドキュメント分析結果**

統合対応ドキュメント（`docs/api-integration-spec.md`, `docs/integration/AUTH_INTEGRATION_SPEC.md`, `docs/API_SPEC.md`等）を深読みし、現在無効化された248個のAPIと照合した結果、以下のAPIがhotel-commonで不足しています。

## **🚨 最優先実装必須API（認証・基幹機能）**

### **🔐 認証・セキュリティ系**
```yaml
# 統合認証仕様書準拠
POST /api/v1/auth/login                    # ログイン処理
GET  /api/v1/auth/validate-token           # トークン検証
POST /api/v1/auth/refresh                  # トークン更新
GET  /api/v1/tenants/{id}                  # テナント情報取得
GET  /api/v1/staff/{id}                    # スタッフ情報取得

# 統合認証フロー対応
POST /api/v1/integration/validate-token   # 統合トークン検証
GET  /api/v1/integration/health            # 統合ヘルスチェック
```

### **📊 管理画面必須API**
```yaml
# ダッシュボード・統計系（docs/API_SPEC.md準拠）
GET  /api/v1/admin/summary                 # サマリー統計
GET  /api/v1/admin/dashboard/stats         # ダッシュボード統計
GET  /api/v1/admin/devices/count           # デバイス数
GET  /api/v1/admin/orders/monthly-count    # 月次注文数
GET  /api/v1/admin/rankings                # ランキング

# 統計・分析系（248個の無効化APIから特定）
GET  /api/v1/admin/statistics/kpis         # KPI統計
GET  /api/v1/admin/statistics/popular-products    # 人気商品
GET  /api/v1/admin/statistics/room-analysis       # 部屋分析
GET  /api/v1/admin/statistics/time-analysis       # 時間分析
GET  /api/v1/admin/statistics/profitability-analysis # 収益性分析
GET  /api/v1/admin/statistics/export/csv   # CSV出力
```

## **🛒 顧客機能必須API（高優先度）**

### **注文・メニュー系**
```yaml
# 基本注文機能（api-integration-spec.md準拠）
GET  /api/v1/orders/history               # 注文履歴
POST /api/v1/orders                       # 注文作成
GET  /api/v1/orders/active                # アクティブ注文
GET  /api/v1/orders/{id}                  # 注文詳細
PUT  /api/v1/orders/{id}/status           # 注文ステータス更新

# メニュー・カテゴリ系
GET  /api/v1/menus/top                    # トップメニュー
GET  /api/v1/order/menu                   # メニュー一覧
GET  /api/v1/menu/gacha-menus             # ガチャメニュー
POST /api/v1/order/place                  # 注文配置
POST /api/v1/order/gacha-draw             # ガチャ実行
```

### **レシート・決済系**
```yaml
# レシート機能
GET  /api/v1/receipts/{receiptId}         # レシート取得
```

## **🏨 ホテル管理API（中優先度）**

### **部屋・デバイス管理**
```yaml
# 部屋管理（api-migration-plan.md高優先度）
GET  /api/v1/admin/rooms                  # 部屋一覧
GET  /api/v1/admin/rooms/{roomNumber}/logs    # 部屋ログ
GET  /api/v1/admin/rooms/{roomNumber}/memos   # 部屋メモ

# デバイス管理
GET  /api/v1/admin/devices                # デバイス一覧
POST /api/v1/admin/devices                # デバイス作成
GET  /api/v1/admin/devices/{id}           # デバイス詳細
PUT  /api/v1/admin/devices/{id}           # デバイス更新
DELETE /api/v1/admin/devices/{id}         # デバイス削除
GET  /api/v1/admin/devices/access-logs    # アクセスログ
POST /api/v1/admin/devices/validate       # デバイス検証
```

### **フロント・請求管理**
```yaml
# フロント業務
GET  /api/v1/admin/front-desk/rooms       # フロント部屋管理
GET  /api/v1/admin/front-desk/room-orders # 部屋注文
POST /api/v1/admin/front-desk/checkin     # チェックイン
POST /api/v1/admin/front-desk/checkout    # チェックアウト
GET  /api/v1/admin/front-desk/accounting  # 会計
POST /api/v1/admin/front-desk/billing     # 請求

# 請求・会計
GET  /api/v1/admin/billing/history        # 請求履歴
POST /api/v1/admin/billing/calculate-monthly # 月次計算
POST /api/v1/admin/billing/generate-invoice  # 請求書生成
```

## **🤖 AIコンシェルジュAPI（中優先度）**

### **チャット・検索系**
```yaml
# AI機能（統合対応ドキュメント準拠）
POST /api/v1/concierge/chat               # チャット
POST /api/v1/concierge/vector-search      # ベクトル検索
POST /api/v1/concierge/preview            # プレビュー
GET  /api/v1/concierge/response-tree      # 応答ツリー
GET  /api/v1/concierge/response-tree/node/{nodeId} # ノード取得
POST /api/v1/concierge/response-tree/search # ツリー検索
GET  /api/v1/concierge/qr-session/{sessionId} # QRセッション
```

## **⚙️ 設定・管理API（中優先度）**

### **システム設定**
```yaml
# 設定管理
GET  /api/v1/admin/settings               # 設定取得
PUT  /api/v1/admin/settings               # 設定更新
GET  /api/v1/admin/settings/hotel-info    # ホテル情報
POST /api/v1/admin/settings/hotel-info    # ホテル情報更新
GET  /api/v1/admin/settings/business-info # 事業者情報
POST /api/v1/admin/settings/business-info # 事業者情報更新

# メニュー・カテゴリ管理
GET  /api/v1/admin/menu                   # メニュー管理一覧
POST /api/v1/admin/menu                   # メニュー作成
GET  /api/v1/admin/menu/{id}              # メニュー詳細
PUT  /api/v1/admin/menu/{id}              # メニュー更新
DELETE /api/v1/admin/menu/{id}            # メニュー削除

GET  /api/v1/admin/categories             # カテゴリ一覧
POST /api/v1/admin/categories             # カテゴリ作成
PUT  /api/v1/admin/categories/{id}        # カテゴリ更新
DELETE /api/v1/admin/categories/{id}      # カテゴリ削除
```

## **📱 デバイス・TV系API（低優先度）**

### **TV・アプリ管理**
```yaml
# TV機能
GET  /api/v1/tv/apps                      # TVアプリ一覧
GET  /api/v1/admin/tv/apps                # TVアプリ管理
POST /api/v1/admin/tv/apps                # TVアプリ作成
PUT  /api/v1/admin/tv/apps/{id}           # TVアプリ更新
DELETE /api/v1/admin/tv/apps/{id}         # TVアプリ削除

# デバイス認証
POST /api/v1/device/auth                  # デバイス認証
POST /api/v1/device/manual-auth           # 手動認証
POST /api/v1/device/check-status          # ステータス確認
```

## **📊 実装優先度マトリックス**

| 優先度 | カテゴリ | API数 | 実装期限 |
|--------|----------|-------|----------|
| 🚨 最優先 | 認証・基幹機能 | 15個 | 即座 |
| 🔥 高優先 | 顧客機能 | 12個 | 1-2日 |
| ⚡ 中優先 | ホテル管理 | 25個 | 1週間 |
| 🤖 中優先 | AIコンシェルジュ | 8個 | 1週間 |
| ⚙️ 中優先 | 設定・管理 | 20個 | 2週間 |
| 📱 低優先 | デバイス・TV | 10個 | 1ヶ月 |

**合計**: 約90個のAPIエンドポイントがhotel-commonで不足

---

### 付録: Room Memo 正規実装の指示
- 仕様書: `docs/specs/2025-09-10_room-memo-spec.v1.md`
- サマリ:
  - category: reservation|handover|lost_item|maintenance|cleaning|guest_request|other（default: handover）
  - visibility: public|private|role（default: public、roleはvisibleRoles適用）
  - 既読管理: 任意（Phase 2）
  - rooms.notes: 廃止（room_memosへ移行）
  - API一覧: GET/POST/PUT/DELETE + comments/history/status あり

## **🎯 次のアクション**

### **hotel-commonチーム向け**
1. **最優先**: 認証・基幹機能API（15個）の実装
2. **高優先**: 顧客機能API（12個）の実装
3. **段階的**: 残りAPIの計画的実装

### **hotel-saasチーム向け**
1. hotel-common実装完了後に段階的復旧
2. 各APIの動作確認・統合テスト
3. パフォーマンス・エラーハンドリング最適化

---
**作成日時**: 2024-12-19 15:00
**基準**: 統合対応ドキュメント + 248個無効化API分析
**総合評価**: hotel-commonで約90個のAPIエンドポイント実装が必要
